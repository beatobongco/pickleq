import { useMemo } from 'react';
import { Button } from './Button';
import type { Player } from '../types';

interface LiveStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  totalGames: number;
  location: string;
}

export function LiveStandingsModal({
  isOpen,
  onClose,
  players,
  totalGames,
  location,
}: LiveStandingsModalProps) {
  // Calculate leaderboard - same logic as LeaderboardScreen
  const leaderboard = useMemo(() => {
    return [...players]
      .filter(p => p.gamesPlayed > 0)
      .sort((a, b) => {
        // Primary: Most wins
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Tiebreaker 1: Win percentage
        const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
        const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
        if (bWinRate !== aWinRate) return bWinRate - aWinRate;
        // Tiebreaker 2: Fewer games (efficiency)
        if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
        // Tiebreaker 3: Alphabetical
        return a.name.localeCompare(b.name);
      });
  }, [players]);

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const getWinRate = (player: Player) => {
    if (player.gamesPlayed === 0) return 0;
    return Math.round((player.wins / player.gamesPlayed) * 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 pb-safe">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Live Standings</h3>
            <p className="text-sm text-gray-500">{location} • {totalGames} games</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl p-1"
          >
            &times;
          </button>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 overflow-y-auto">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">🏓</div>
              <p className="text-lg">No games completed yet</p>
              <p className="text-sm mt-1">Standings will appear after the first game</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((player, index) => {
                const medal = getMedal(index);
                const winRate = getWinRate(player);
                const isTopThree = index < 3;
                const isPlaying = player.status === 'playing';

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 px-6 py-4 ${
                      isTopThree ? 'bg-yellow-50' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center flex-shrink-0">
                      {medal ? (
                        <span className="text-2xl">{medal}</span>
                      ) : (
                        <span className="text-xl font-bold text-gray-400">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate ${isTopThree ? 'text-lg' : 'text-base'} text-gray-900`}>
                          {player.name}
                        </span>
                        {player.skill && (
                          <span className="text-xs">
                            <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                            <span className="text-gray-300">{'★'.repeat(3 - player.skill)}</span>
                          </span>
                        )}
                        {isPlaying && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Playing
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.wins}-{player.losses} • {player.gamesPlayed} games
                      </div>
                    </div>

                    {/* Wins */}
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} text-green-600`}>
                        {player.wins}
                      </div>
                      <div className="text-xs text-gray-400">WINS</div>
                    </div>

                    {/* Win Rate */}
                    <div className="text-right flex-shrink-0 w-14">
                      <div className={`font-semibold text-sm ${winRate >= 50 ? 'text-gray-600' : 'text-gray-400'}`}>
                        {winRate}%
                      </div>
                      <div className="text-xs text-gray-400">WIN %</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="w-full"
          >
            Back to Game
          </Button>
        </div>
      </div>
    </div>
  );
}
