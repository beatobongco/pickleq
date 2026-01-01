import { useState, useMemo } from 'react';
import { useSession } from '../store/useSession';
import { getSavedLocations } from '../utils/storage';
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
    removePlayer,
    setPlayerSkill,
    checkInPlayer,
    startSession,
  } = useSession();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const savedLocations = useMemo(() => getSavedLocations(), []);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handleSelectLocation = (loc: string) => {
    setLocation(loc);
    setShowLocationDropdown(false);
  };

  const notHerePlayers = session.players.filter(p => p.status === 'not-here');
  const checkedInPlayers = session.players.filter(p => p.status === 'checked-in');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">DinkSync</h1>
        <p className="text-gray-600 text-sm">Pickleball Open Play Manager</p>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Location */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location
          </label>
          <div className="relative">
            <input
              type="text"
              value={session.location}
              onChange={(e) => setLocation(e.target.value)}
              onFocus={() => savedLocations.length > 0 && setShowLocationDropdown(true)}
              placeholder="Enter location name..."
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
            />
            {showLocationDropdown && savedLocations.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {savedLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    {loc}
                  </button>
                ))}
                <button
                  onClick={() => setShowLocationDropdown(false)}
                  className="w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
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
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name..."
              className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
            />
            <Button type="submit" variant="primary" size="lg" disabled={!newPlayerName.trim()}>
              Add
            </Button>
          </form>
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
