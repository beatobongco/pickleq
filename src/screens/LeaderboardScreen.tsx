import { useEffect, useRef, useState } from 'react';
import { useSession } from '../store/useSession';
import { Button } from '../components/Button';
import { QRCode } from '../components/QRCode';
import { ShareModal } from '../components/ShareModal';
import { calculateLeaderboard, getWinPercentage } from '../utils/matching';
import { announceLeaderboard } from '../utils/speech';
import { getLocalVenue } from '../utils/supabase';
import type { Player } from '../types';

const CLOUD_BANNER_DISMISSED_KEY = 'dinksync_cloud_banner_dismissed';

export function LeaderboardScreen() {
  const { session, newSession, syncedSessionId, setScreen } = useSession();
  const venue = getLocalVenue();
  const hasAnnounced = useRef(false);
  const [cloudBannerDismissed, setCloudBannerDismissed] = useState(
    () => localStorage.getItem(CLOUD_BANNER_DISMISSED_KEY) === 'true'
  );

  const dismissCloudBanner = () => {
    localStorage.setItem(CLOUD_BANNER_DISMISSED_KEY, 'true');
    setCloudBannerDismissed(true);
  };

  const showCloudBanner = !venue && !cloudBannerDismissed;

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

  const [sharePlayer, setSharePlayer] = useState<Player | null>(null);

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={newSession}
            className="text-left hover:opacity-80 transition-opacity"
          >
            <h1 className="text-2xl font-bold text-gray-900">🏓 PickleQ</h1>
            <p className="text-gray-600 text-sm">Session Complete</p>
          </button>
          <div className="text-right">
            <div className="text-4xl">🏆</div>
            {venue && (
              <p className="text-xs text-gray-500 mt-1">{venue.name}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Cloud Sync Banner */}
        {showCloudBanner && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-sm mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">☁️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Save your results to the cloud</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Keep player stats across devices and let players view their own leaderboard from their phones.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setScreen('venue-setup')}
                  >
                    Set Up Now
                  </Button>
                  <button
                    onClick={dismissCloudBanner}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{totalGames}</div>
              <div className="text-xs md:text-sm text-gray-500">Games</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{sessionDuration}</div>
              <div className="text-xs md:text-sm text-gray-500">Minutes</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900">{session.courts}</div>
              <div className="text-xs md:text-sm text-gray-500">Courts</div>
            </div>
          </div>
        </div>

        {/* Shareable Session QR Code */}
        {venue && syncedSessionId && (
          <div className="bg-green-100 rounded-2xl p-4 shadow-sm mb-6">
            <div className="text-center">
              <div className="text-sm font-semibold text-green-800 mb-3">
                Scan to view your stats and share!
              </div>
              <div className="flex justify-center mb-3">
                <QRCode
                  url={`${window.location.origin}/venue/${venue.slug}/session/${syncedSessionId}`}
                  size={160}
                />
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/venue/${venue.slug}/session/${syncedSessionId}`;
                  navigator.clipboard.writeText(url);
                }}
                className="px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors min-h-[44px]"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Syncing indicator */}
        {venue && !syncedSessionId && (
          <div className="bg-gray-100 rounded-2xl p-4 shadow-sm mb-6 text-center">
            <div className="text-sm text-gray-500">
              ⏳ Syncing session to cloud...
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800">FINAL STANDINGS</h2>
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
                      ${isTopThree ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                      transition-colors
                    `}
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
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.wins}-{player.losses} · {player.gamesPlayed} games
                      </div>
                    </div>

                    {/* Win Percentage */}
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} ${winPct >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                        {winPct}%
                      </div>
                      <div className="text-xs text-gray-400">WIN RATE</div>
                    </div>

                    {/* Share Button */}
                    <button
                      onClick={() => setSharePlayer(player)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
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

      {/* Share Modal */}
      {sharePlayer && (
        <ShareModal
          isOpen={true}
          onClose={() => setSharePlayer(null)}
          player={{
            name: sharePlayer.name,
            skill: sharePlayer.skill,
            wins: sharePlayer.wins,
            losses: sharePlayer.losses,
            gamesPlayed: sharePlayer.gamesPlayed,
          }}
          location={session.location}
          venueName={venue?.name}
        />
      )}
    </div>
  );
}
