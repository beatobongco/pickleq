import { useMemo, useState } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { getSkillLabel } from '../components/SkillSelector';
import { ShareModal } from '../components/ShareModal';
import { getSavedPlayers, type SavedPlayer } from '../utils/storage';

export function GlobalLeaderboardScreen() {
  const { setScreen } = useSession();
  const [sharePlayer, setSharePlayer] = useState<SavedPlayer | null>(null);

  const players = useMemo(() => getSavedPlayers(), []);

  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter(p => p.lifetimeGames > 0)
      .sort((a, b) => {
        // Sort by win rate, then by games played
        const aWinRate = a.lifetimeGames > 0 ? a.lifetimeWins / a.lifetimeGames : 0;
        const bWinRate = b.lifetimeGames > 0 ? b.lifetimeWins / b.lifetimeGames : 0;
        if (bWinRate !== aWinRate) return bWinRate - aWinRate;
        return b.lifetimeGames - a.lifetimeGames;
      });
  }, [players]);

  const getWinRate = (player: SavedPlayer) => {
    if (player.lifetimeGames === 0) return 0;
    return Math.round((player.lifetimeWins / player.lifetimeGames) * 100);
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const totalGames = players.reduce((sum, p) => sum + p.lifetimeGames, 0);
  const totalPlayers = players.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All-Time Leaderboard</h1>
            <p className="text-gray-600 text-sm">Lifetime stats across all sessions</p>
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
        {/* Global Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalPlayers}</div>
              <div className="text-sm text-gray-500">Total Players</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalGames}</div>
              <div className="text-sm text-gray-500">Total Games</div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Rankings</h2>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">🏓</div>
              <p className="text-lg">No games played yet</p>
              <p className="text-sm mt-1">Complete a session to see lifetime stats</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedPlayers.map((player, index) => {
                const medal = getMedal(index);
                const winRate = getWinRate(player);
                const isTopThree = index < 3;

                return (
                  <div
                    key={player.id}
                    className={`
                      flex items-center gap-4 px-4 py-4
                      ${isTopThree ? 'bg-blue-50' : ''}
                    `}
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {medal ? (
                        <span className="text-2xl">{medal}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">
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
                          <span className="text-sm text-gray-500">
                            <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                            {' '}{getSkillLabel(player.skill)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.lifetimeWins}W - {player.lifetimeLosses}L
                        <span className="mx-1">•</span>
                        {player.lifetimeGames} games
                      </div>
                    </div>

                    {/* Win Percentage */}
                    <div className="text-right">
                      <div className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} ${winRate >= 50 ? 'text-green-600' : 'text-gray-600'}`}>
                        {winRate}%
                      </div>
                      <div className="text-xs text-gray-400">WIN RATE</div>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={() => setSharePlayer(player)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Share stats"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Players with no games */}
        {players.filter(p => p.lifetimeGames === 0).length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-500 mb-2">
              No Games Yet ({players.filter(p => p.lifetimeGames === 0).length})
            </h3>
            <div className="text-gray-400 text-sm">
              {players
                .filter(p => p.lifetimeGames === 0)
                .map(p => p.name)
                .join(', ')}
            </div>
          </div>
        )}
      </main>

      {/* Share Modal */}
      {sharePlayer && (
        <ShareModal
          isOpen={true}
          onClose={() => setSharePlayer(null)}
          player={{
            name: sharePlayer.name,
            skill: sharePlayer.skill,
            wins: sharePlayer.lifetimeWins,
            losses: sharePlayer.lifetimeLosses,
            gamesPlayed: sharePlayer.lifetimeGames,
          }}
        />
      )}
    </div>
  );
}
