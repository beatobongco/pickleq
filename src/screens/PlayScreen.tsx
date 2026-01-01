import { useState, useEffect, useRef } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { CourtCard } from '../components/CourtCard';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerPicker } from '../components/PlayerPicker';
import { getSkillLabel } from '../components/SkillSelector';
import { UndoToast } from '../components/UndoToast';
import { getPlayersWhoHaventPlayedRecently } from '../utils/matching';
import { announceNextMatch, announceWinner, isMuted, setMuted } from '../utils/speech';

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
  const [muted, setMutedState] = useState(isMuted);
  const sessionPlayerNames = session.players.map(p => p.name);

  const toggleMute = () => {
    const newMuted = !muted;
    setMutedState(newMuted);
    setMuted(newMuted);
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${
                muted
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              title={muted ? 'Unmute announcements' : 'Mute announcements'}
            >
              {muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
            >
              End Session
            </Button>
          </div>
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
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {queue.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-2 md:gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl"
              >
                <span className="text-lg font-bold text-yellow-600 w-8 flex-shrink-0">
                  #{index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 truncate block">{player.name}</span>
                  {player.skill && (
                    <span className="text-xs text-gray-500">
                      <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                      {' '}{getSkillLabel(player.skill)}
                    </span>
                  )}
                </div>
                <span className="text-xs md:text-sm text-gray-500 flex-shrink-0">
                  {player.gamesPlayed}g
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => checkOutPlayer(player.id)}
                  className="text-gray-500 hover:text-red-600 flex-shrink-0"
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
          <PlayerPicker
            sessionPlayerNames={sessionPlayerNames}
            onAddPlayer={addPlayer}
            onAddPlayerWithSkill={addPlayerWithSkill}
          />
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
