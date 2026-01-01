import { useState, useMemo } from 'react';
import { useSession } from '../store/useSession';
import { getSavedLocations, searchPlayers, type SavedPlayer } from '../utils/storage';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';

export function SetupScreen() {
  const {
    session,
    checkedInCount,
    canStartSession,
    setLocation,
    setCourts,
    addPlayer,
    addPlayerWithSkill,
    removePlayer,
    setPlayerSkill,
    checkInPlayer,
    startSession,
    setScreen,
  } = useSession();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const savedLocations = useMemo(() => getSavedLocations(), []);

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

  const handleSelectLocation = (loc: { name: string; courts: number }) => {
    setLocation(loc.name);
    setCourts(loc.courts);
  };

  const notHerePlayers = session.players.filter(p => p.status === 'not-here');
  const checkedInPlayers = session.players.filter(p => p.status === 'checked-in');

  const getWinRate = (player: SavedPlayer) => {
    if (player.lifetimeGames === 0) return null;
    return Math.round((player.lifetimeWins / player.lifetimeGames) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DinkSync</h1>
            <p className="text-gray-600 text-sm">Pickleball Open Play Manager</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScreen('global-leaderboard')}
          >
            Leaderboard
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Location */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location
          </label>

          {/* Saved locations as quick-select buttons */}
          {savedLocations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {savedLocations.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handleSelectLocation(loc)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    session.location === loc.name
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {loc.name}
                  <span className="ml-1 opacity-70">({loc.courts})</span>
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            value={session.location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={savedLocations.length > 0 ? "Or enter new location..." : "Enter location name..."}
            className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
          />
        </section>

        {/* Courts */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Courts
          </label>
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCourts(session.courts - 1)}
              disabled={session.courts <= 1}
              className="w-16 h-16 text-2xl"
            >
              −
            </Button>
            <span className="text-5xl font-bold text-gray-900 w-20 text-center">
              {session.courts}
            </span>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCourts(session.courts + 1)}
              disabled={session.courts >= 10}
              className="w-16 h-16 text-2xl"
            >
              +
            </Button>
          </div>
        </section>

        {/* Add Players */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add Players
          </label>
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

        {/* Checked In Players */}
        {checkedInPlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Checked In ({checkedInPlayers.length})
              </h2>
            </div>
            <div className="space-y-2">
              {checkedInPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showSkill={true}
                  showActions={false}
                  onSkillChange={(skill) => setPlayerSkill(player.id, skill)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Not Here Players */}
        {notHerePlayers.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Not Yet Here ({notHerePlayers.length})
              </h2>
            </div>
            <div className="space-y-2">
              {notHerePlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showSkill={true}
                  showActions={true}
                  onSkillChange={(skill) => setPlayerSkill(player.id, skill)}
                  onCheckIn={() => checkInPlayer(player.id)}
                  onRemove={() => removePlayer(player.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {session.players.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No players added yet</p>
            <p className="text-sm">Add players above to get started</p>
          </div>
        )}
      </main>

      {/* Start Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={startSession}
            disabled={!canStartSession}
            className="w-full text-xl py-5"
          >
            {canStartSession
              ? 'START PLAY'
              : `${checkedInCount}/4 players checked in${!session.location.trim() ? ' • Need location' : ''}`}
          </Button>
        </div>
      </div>

      {/* Bottom padding for fixed button */}
      <div className="h-24" />
    </div>
  );
}
