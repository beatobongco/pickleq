import { useMemo } from 'react';
import { useSession } from '../store/useSession';
import { getSavedLocations } from '../utils/storage';
import { getLocalVenue } from '../utils/supabase';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerPicker } from '../components/PlayerPicker';

export function SetupScreen() {
  const {
    session,
    checkedInCount,
    canStartSession,
    setLocation,
    setCourts,
    setGameMode,
    addPlayer,
    addPlayerWithSkill,
    removePlayer,
    setPlayerSkill,
    checkInPlayer,
    startSession,
    setScreen,
  } = useSession();

  const savedLocations = useMemo(() => getSavedLocations(), []);
  const venue = useMemo(() => getLocalVenue(), []);

  const handleSelectLocation = (loc: { name: string; courts: number }) => {
    setLocation(loc.name);
    setCourts(loc.courts);
  };

  const notHerePlayers = session.players.filter(p => p.status === 'not-here');
  const checkedInPlayers = session.players.filter(p => p.status === 'checked-in');
  const sessionPlayerNames = session.players.map(p => p.name);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏓 PickleQ</h1>
            <p className="text-gray-600 text-sm">
              Pickleball Open Play Manager
              <span className="mx-1">•</span>
              <a
                href="how-to-use.html"
                className="text-green-600 hover:text-green-700 hover:underline"
              >
                Help
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setScreen('venue-setup')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                venue
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              {venue ? (
                <>
                  <span className="text-green-500">☁️</span>
                  Synced
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save to Cloud
                </>
              )}
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScreen('players')}
            >
              Players
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScreen('global-leaderboard')}
            >
              Leaderboard
            </Button>
          </div>
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

        {/* Game Mode */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Game Mode
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setGameMode('doubles')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                session.gameMode === 'doubles'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Doubles (4 players)
            </button>
            <button
              onClick={() => setGameMode('singles')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                session.gameMode === 'singles'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Singles (2 players)
            </button>
          </div>
        </section>

        {/* Add Players */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add Players
          </label>
          <PlayerPicker
            sessionPlayerNames={sessionPlayerNames}
            onAddPlayer={addPlayer}
            onAddPlayerWithSkill={addPlayerWithSkill}
          />
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
              : `${checkedInCount}/${session.gameMode === 'doubles' ? 4 : 2} players checked in${!session.location.trim() ? ' • Need location' : ''}`}
          </Button>
        </div>
      </div>

      {/* Bottom padding for fixed button */}
      <div className="h-24" />
    </div>
  );
}
