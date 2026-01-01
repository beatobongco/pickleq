import { useState, useMemo } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { SkillSelector } from '../components/SkillSelector';
import {
  getSavedPlayers,
  updateSavedPlayerSkill,
  updateSavedPlayerName,
  deleteSavedPlayer,
  type SavedPlayer,
} from '../utils/storage';
import type { SkillLevel } from '../types';

export function PlayersScreen() {
  const { setScreen } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [players, setPlayers] = useState(() => getSavedPlayers());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return players.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
    }
    const lowerQuery = searchQuery.toLowerCase();
    return players
      .filter(p => p.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  }, [players, searchQuery]);

  const handleSkillChange = (playerId: string, skill: SkillLevel) => {
    updateSavedPlayerSkill(playerId, skill);
    setPlayers(getSavedPlayers());
  };

  const startEditing = (player: SavedPlayer) => {
    setEditingPlayer(player.id);
    setEditName(player.name);
  };

  const saveEdit = (playerId: string) => {
    if (editName.trim()) {
      updateSavedPlayerName(playerId, editName);
      setPlayers(getSavedPlayers());
    }
    setEditingPlayer(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingPlayer(null);
    setEditName('');
  };

  const handleDelete = (playerId: string) => {
    deleteSavedPlayer(playerId);
    setPlayers(getSavedPlayers());
    setDeleteConfirm(null);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Manage Players</h1>
            <p className="text-gray-600 text-sm">Edit skill levels and player details</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScreen('setup')}
          >
            Back
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{players.length}</div>
            <div className="text-sm text-gray-500">Total Players</div>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">
              {searchQuery ? `${filteredPlayers.length} results` : 'All Players'}
            </h2>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? (
                <p>No players match "{searchQuery}"</p>
              ) : (
                <>
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-lg">No players yet</p>
                  <p className="text-sm mt-1">Players will appear here after sessions</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPlayers.map((player) => {
                const winRate = getWinRate(player);
                const isEditing = editingPlayer === player.id;

                return (
                  <div key={player.id} className="px-4 py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => saveEdit(player.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {player.name}
                            </span>
                            <button
                              onClick={() => startEditing(player)}
                              className="text-gray-400 hover:text-blue-500 text-sm"
                              title="Edit name"
                            >
                              ✏️
                            </button>
                          </div>
                          <div className="text-sm text-gray-500">
                            {player.lifetimeGames > 0 ? (
                              <>
                                {player.lifetimeWins}W - {player.lifetimeLosses}L
                                <span className="mx-1">•</span>
                                {player.lifetimeGames} games
                                {winRate !== null && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span className={winRate >= 50 ? 'text-green-600' : ''}>
                                      {winRate}%
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              'No games played'
                            )}
                          </div>
                        </div>

                        {/* Skill Selector */}
                        <div className="flex items-center gap-2">
                          <SkillSelector
                            skill={player.skill}
                            onChange={(skill) => handleSkillChange(player.id, skill)}
                            size="md"
                          />
                        </div>

                        {/* Delete */}
                        {deleteConfirm === player.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(player.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(player.id)}
                            className="text-gray-400 hover:text-red-500 p-2"
                            title="Delete player"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Tap the stars to change skill level</p>
          <p className="mt-1">
            <span className="text-yellow-500">★</span> Beginner
            <span className="mx-2">•</span>
            <span className="text-yellow-500">★★</span> Intermediate
            <span className="mx-2">•</span>
            <span className="text-yellow-500">★★★</span> Advanced
          </p>
        </div>
      </main>
    </div>
  );
}
