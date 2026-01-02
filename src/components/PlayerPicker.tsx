import { useState, useMemo } from 'react';
import { Button } from './Button';
import { SkillSelector, getSkillLabel } from './SkillSelector';
import { getSavedPlayers, type SavedPlayer } from '../utils/storage';
import type { SkillLevel } from '../types';

interface PlayerPickerProps {
  sessionPlayerNames: string[];
  onAddPlayer: (name: string) => void;
  onAddPlayerWithSkill: (name: string, skill: SkillLevel) => void;
}

export function PlayerPicker({
  sessionPlayerNames,
  onAddPlayer,
  onAddPlayerWithSkill,
}: PlayerPickerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState<SkillLevel>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const allSavedPlayers = useMemo(() => getSavedPlayers(), []);

  // Filter players based on search and exclude those already in session
  const availablePlayers = useMemo(() => {
    const lowerSessionNames = sessionPlayerNames.map(n => n.toLowerCase());
    const filtered = allSavedPlayers.filter(
      p => !lowerSessionNames.includes(p.name.toLowerCase())
    );

    // If searching, filter by query
    if (newPlayerName.trim().length >= 1) {
      const lowerQuery = newPlayerName.toLowerCase();
      return filtered
        .filter(p => p.name.toLowerCase().includes(lowerQuery))
        .sort((a, b) => {
          // Exact match first
          const aExact = a.name.toLowerCase() === lowerQuery;
          const bExact = b.name.toLowerCase() === lowerQuery;
          if (aExact && !bExact) return -1;
          if (bExact && !aExact) return 1;
          // Then by most recently played
          return (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0);
        });
    }

    // Otherwise sort by most recently played
    return filtered.sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  }, [allSavedPlayers, sessionPlayerNames, newPlayerName]);

  const handleAddPlayer = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;

    // Check for duplicate (case-insensitive)
    if (sessionPlayerNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      return; // Don't add duplicates
    }

    // Check if there's an exact match in saved players to get their skill
    const savedPlayer = availablePlayers.find(
      p => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (savedPlayer) {
      onAddPlayerWithSkill(savedPlayer.name, savedPlayer.skill);
    } else if (newPlayerSkill) {
      onAddPlayerWithSkill(trimmedName, newPlayerSkill);
    } else {
      onAddPlayer(trimmedName);
    }
    setNewPlayerName('');
    setNewPlayerSkill(null);
  };

  const handleSelectPlayer = (player: SavedPlayer) => {
    onAddPlayerWithSkill(player.name, player.skill);
    setNewPlayerName('');
  };

  const getWinRate = (player: SavedPlayer) => {
    if (player.lifetimeGames === 0) return null;
    return Math.round((player.lifetimeWins / player.lifetimeGames) * 100);
  };

  const hasSearchQuery = newPlayerName.trim().length > 0;
  const lowerSessionNames = sessionPlayerNames.map(n => n.toLowerCase());
  const isDuplicateName = lowerSessionNames.includes(newPlayerName.trim().toLowerCase());
  const showNewPlayerOption = hasSearchQuery && !isDuplicateName && !availablePlayers.some(
    p => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
  );

  return (
    <div className="space-y-3">
      {/* Search/Add Input */}
      <form onSubmit={handleAddPlayer} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Search or add new player..."
            className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
          />
          {showNewPlayerOption && (
            <Button type="submit" variant="primary" size="lg">
              Add
            </Button>
          )}
        </div>
        {showNewPlayerOption && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-sm text-gray-500">Skill:</span>
            <SkillSelector skill={newPlayerSkill} onChange={setNewPlayerSkill} size="sm" />
          </div>
        )}
      </form>

      {/* Player List */}
      {availablePlayers.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 bg-gray-50 border-b text-left flex items-center justify-between"
          >
            <span className="text-sm font-medium text-gray-600">
              {hasSearchQuery
                ? `${availablePlayers.length} matching player${availablePlayers.length !== 1 ? 's' : ''}`
                : `${availablePlayers.length} saved player${availablePlayers.length !== 1 ? 's' : ''}`}
            </span>
            <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
          </button>

          {isExpanded && (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
              {availablePlayers.map((player) => {
                const winRate = getWinRate(player);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      {player.skill && (
                        <span className="text-sm text-gray-500">
                          <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                          {' '}{getSkillLabel(player.skill)}
                        </span>
                      )}
                    </div>
                    {player.lifetimeGames > 0 && (
                      <span className="text-sm text-gray-500">
                        {winRate}% · {player.lifetimeGames} games
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duplicate name warning */}
      {hasSearchQuery && isDuplicateName && (
        <div className="text-center py-3 text-amber-600 bg-amber-50 rounded-xl">
          <p className="text-sm">"{newPlayerName.trim()}" is already in this session</p>
        </div>
      )}

      {/* New Player hint when searching with no matches */}
      {hasSearchQuery && !isDuplicateName && availablePlayers.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No saved players match "{newPlayerName}"</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <SkillSelector skill={newPlayerSkill} onChange={setNewPlayerSkill} size="sm" />
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleAddPlayer}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Empty state when no saved players */}
      {!hasSearchQuery && availablePlayers.length === 0 && allSavedPlayers.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No saved players yet. Type a name above to add players.
        </div>
      )}

      {/* All players in session */}
      {!hasSearchQuery && availablePlayers.length === 0 && allSavedPlayers.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          All saved players are already in this session.
        </div>
      )}
    </div>
  );
}
