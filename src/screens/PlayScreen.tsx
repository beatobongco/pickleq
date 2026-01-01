import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { CourtCard } from '../components/CourtCard';
import { PlayerCard } from '../components/PlayerCard';
import { UndoToast } from '../components/UndoToast';
import { getPlayersWhoHaventPlayedRecently } from '../utils/matching';
import { announceNextMatch, announceWinner } from '../utils/speech';
import { searchPlayers, type SavedPlayer } from '../utils/storage';

export function PlayScreen() {
  const {
    session,
    queue,
    undoAction,
    recordWinner,
    undoWinner,
    removeFromCourt,
    checkInPlayer,
    checkOutPlayer,
    endSession,
    clearUndo,
    addPlayer,
    addPlayerWithSkill,
  } = useSession();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search for matching players as user types
  const playerSuggestions = useMemo(() => {
    if (!newPlayerName.trim() || newPlayerName.length < 2) return [];
    const suggestions = searchPlayers(newPlayerName);
    // Filter out players already in this session
    const sessionPlayerNames = session.players.map(p => p.name.toLowerCase());
    return suggestions.filter(s => !sessionPlayerNames.includes(s.name.toLowerCase()));
  }, [newPlayerName, session.players]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      // Check if there's an exact match in saved players to get their skill
      const savedPlayer = playerSuggestions.find(
        p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      );
      if (savedPlayer) {
        addPlayerWithSkill(savedPlayer.name, savedPlayer.skill);
      } else {
        addPlayer(newPlayerName);
      }
      setNewPlayerName('');
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (player: SavedPlayer) => {
    addPlayerWithSkill(player.name, player.skill);
    setNewPlayerName('');
    setShowSuggestions(false);
  };

  const getWinRate = (player: SavedPlayer) => {
    if (player.lifetimeGames === 0) return null;
    return Math.round((player.lifetimeWins / player.lifetimeGames) * 100);
  };

  // Track announced matches to avoid re-announcing
  const announcedMatches = useRef<Set<string>>(new Set());

  // Announce new matches when they appear
  useEffect(() => {
    for (const match of session.activeMatches) {
      if (!announcedMatches.current.has(match.id)) {
        announcedMatches.current.add(match.id);

        // Get player names for announcement
        const team1Names = match.team1
          .map(id => session.players.find(p => p.id === id)?.name)
          .filter(Boolean) as string[];
        const team2Names = match.team2
          .map(id => session.players.find(p => p.id === id)?.name)
          .filter(Boolean) as string[];

        // Small delay to let UI update first
        setTimeout(() => {
          announceNextMatch(match.court, team1Names, team2Names);
        }, 3000);
      }
    }
  }, [session.activeMatches, session.players]);

  const playersNeedingAttention = getPlayersWhoHaventPlayedRecently(
    session.players,
    session.activeMatches
  );

  const notHerePlayers = session.players.filter(p => p.status === 'not-here');
  const leftPlayers = session.players.filter(p => p.status === 'left');

  // Generate court grid
  const courts = Array.from({ length: session.courts }, (_, i) => i + 1);

  const handleRecordWinner = (matchId: string, winner: 1 | 2) => {
    // Find the match and get winner names before recording (which removes the match)
    const match = session.activeMatches.find(m => m.id === matchId);
    if (match) {
      const winningTeam = winner === 1 ? match.team1 : match.team2;
      const winnerNames = winningTeam
        .map(id => session.players.find(p => p.id === id)?.name)
        .filter(Boolean) as string[];

      // Announce winner
      announceWinner(match.court, winnerNames);
    }

    recordWinner(matchId, winner);
  };

  const handleUndo = () => {
    if (undoAction?.type === 'winner') {
      const data = undoAction.data as { matchId: string };
      undoWinner(data.matchId);
    }
    clearUndo();
  };

  const getMatchForCourt = (court: number) => {
    return session.activeMatches.find(m => m.court === court);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.location}</h1>
            <p className="text-sm text-gray-600">
              {session.matches.length} games completed • {queue.length} in queue
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowEndConfirm(true)}
          >
            End Session
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Alert for players waiting too long */}
        {playersNeedingAttention.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
            <div className="font-semibold text-yellow-800 mb-1">
              Players waiting too long
            </div>
            <div className="text-yellow-700 text-sm">
              {playersNeedingAttention.map(p => p.name).join(', ')} haven't played in 3+ rotations
            </div>
          </div>
        )}

        {/* Courts Grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Courts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courts.map((court) => (
              <CourtCard
                key={court}
                court={court}
                match={getMatchForCourt(court)}
                players={session.players}
                onRecordWinner={handleRecordWinner}
                onRemovePlayer={removeFromCourt}
              />
            ))}
          </div>
        </section>

        {/* Queue */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Waiting Queue ({queue.length})
          </h2>
          {queue.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No players in queue
            </p>
          ) : queue.length < 4 ? (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
              Waiting for {4 - queue.length} more player{4 - queue.length > 1 ? 's' : ''} to start next match
            </div>
          ) : null}
          <div className="space-y-2">
            {queue.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl"
              >
                <span className="text-lg font-bold text-yellow-600 w-8">
                  #{index + 1}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{player.name}</span>
                  {player.skill && (
                    <span className="ml-2 text-yellow-500">
                      {'★'.repeat(player.skill)}
                      <span className="text-gray-300">{'★'.repeat(3 - player.skill)}</span>
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {player.gamesPlayed} games
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => checkOutPlayer(player.id)}
                  className="text-gray-500 hover:text-red-600"
                >
                  Leave
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Add New Player */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Add Player
          </h2>
          <div className="relative">
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => {
                  setNewPlayerName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Player name..."
                className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
              />
              <Button type="submit" variant="primary" size="lg" disabled={!newPlayerName.trim()}>
                Add
              </Button>
            </form>

            {/* Player suggestions dropdown */}
            {showSuggestions && playerSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-16 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500 font-medium">
                  Previous Players
                </div>
                {playerSuggestions.map((player) => {
                  const winRate = getWinRate(player);
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleSelectSuggestion(player)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{player.name}</span>
                        {player.skill && (
                          <span className="ml-2 text-yellow-500 text-sm">
                            {'★'.repeat(player.skill)}
                          </span>
                        )}
                      </div>
                      {player.lifetimeGames > 0 && (
                        <span className="text-sm text-gray-500">
                          {winRate}% • {player.lifetimeGames} games
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Late Arrivals */}
        {notHerePlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Not Yet Here ({notHerePlayers.length})
            </h2>
            <div className="space-y-2">
              {notHerePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showSkill={false}
                  showActions={true}
                  onCheckIn={() => checkInPlayer(player.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Left Early */}
        {leftPlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm opacity-60">
            <h2 className="text-lg font-semibold text-gray-500 mb-3">
              Left Early ({leftPlayers.length})
            </h2>
            <div className="space-y-2">
              {leftPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-gray-100 rounded-xl"
                >
                  <span className="text-gray-500 line-through">{player.name}</span>
                  <span className="ml-3 text-sm text-gray-400">
                    {player.wins}-{player.losses} ({player.gamesPlayed} games)
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Undo Toast */}
      {undoAction && undoAction.type === 'winner' && (
        <UndoToast
          message="Winner recorded"
          onUndo={handleUndo}
          onDismiss={clearUndo}
        />
      )}

      {/* End Session Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              End Session?
            </h3>
            <p className="text-gray-600 mb-6">
              This will show the final leaderboard. {session.activeMatches.length > 0 && 'Active matches will be cancelled.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  setShowEndConfirm(false);
                  endSession();
                }}
                className="flex-1"
              >
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
