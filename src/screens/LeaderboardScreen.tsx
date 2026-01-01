import { useEffect, useRef } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { calculateLeaderboard, getWinPercentage } from '../utils/matching';
import { announceLeaderboard } from '../utils/speech';

export function LeaderboardScreen() {
  const { session, newSession } = useSession();
  const hasAnnounced = useRef(false);

  const leaderboard = calculateLeaderboard(session.players);
  const totalGames = session.matches.length;
  const sessionDuration = session.startTime && session.endTime
    ? Math.round((session.endTime - session.startTime) / 1000 / 60)
    : 0;

  // Announce top 3 when leaderboard screen loads
  useEffect(() => {
    if (!hasAnnounced.current) {
      hasAnnounced.current = true;
      const topPlayers = leaderboard.slice(0, 3).map(player => ({
        name: player.name,
        winPct: getWinPercentage(player),
      }));
      announceLeaderboard(topPlayers);
    }
  }, [leaderboard]);

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50">
      {/* Header */}
      <header className="text-center py-8">
        <div className="text-6xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold text-gray-900">Session Complete!</h1>
        <p className="text-gray-600 mt-2">{session.location}</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Session Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalGames}</div>
              <div className="text-sm text-gray-500">Games Played</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{sessionDuration}</div>
              <div className="text-sm text-gray-500">Minutes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{session.courts}</div>
              <div className="text-sm text-gray-500">Courts Used</div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Final Standings</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No games were completed this session
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaderboard.map((player, index) => {
                const medal = getMedal(index);
                const winPct = getWinPercentage(player);
                const isTopThree = index < 3;

                return (
                  <div
                    key={player.id}
                    className={`
                      flex items-center gap-4 px-4 py-4
                      ${isTopThree ? 'bg-yellow-50' : ''}
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
                      <div className={`font-semibold truncate ${isTopThree ? 'text-lg' : 'text-base'} text-gray-900`}>
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.wins}-{player.losses} • {player.gamesPlayed} games
                      </div>
                    </div>

                    {/* Win Percentage */}
                    <div className="text-right">
                      <div className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} ${winPct >= 50 ? 'text-green-600' : 'text-gray-600'}`}>
                        {winPct}%
                      </div>
                      <div className="text-xs text-gray-400">WIN RATE</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Players who didn't play */}
        {session.players.filter(p => p.gamesPlayed === 0).length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-500 mb-2">Didn't Play</h3>
            <div className="text-gray-400 text-sm">
              {session.players
                .filter(p => p.gamesPlayed === 0)
                .map(p => p.name)
                .join(', ')}
            </div>
          </div>
        )}

        {/* New Session Button */}
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={newSession}
            className="w-full text-xl py-5"
          >
            Start New Session
          </Button>
        </div>
      </main>
    </div>
  );
}
