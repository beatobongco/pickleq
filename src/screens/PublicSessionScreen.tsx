import { useEffect, useState, useMemo, useRef } from 'react';
import {
  getVenueBySlug,
  getSessionById,
  getSessionPlayers,
} from '../utils/supabase';
import { getSkillLabel } from '../components/SkillSelector';
import { PlayerStatsCard } from '../components/PlayerStatsCard';
import { Button } from '../components/Button';
import { captureElement, shareImage, downloadImage, canNativeShare } from '../utils/share';
import { trackPublicSessionViewed, trackStatsShared } from '../utils/analytics';
import type { Venue, VenueSession, SessionPlayer } from '../types';

interface PublicSessionScreenProps {
  slug: string;
  sessionId: string;
}

export function PublicSessionScreen({ slug, sessionId }: PublicSessionScreenProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [session, setSession] = useState<VenueSession | null>(null);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharePlayer, setSharePlayer] = useState<SessionPlayer | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError(null);

      // Load venue first
      const venueData = await getVenueBySlug(slug);
      if (!venueData) {
        setError('Venue not found');
        setLoading(false);
        return;
      }
      setVenue(venueData);

      // Load session
      const sessionData = await getSessionById(sessionId);
      if (!sessionData) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      // Verify session belongs to this venue
      if (sessionData.venueId !== venueData.id) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      trackPublicSessionViewed(slug, sessionId);

      // Load session players
      const playersData = await getSessionPlayers(sessionId);
      setPlayers(playersData);
      setLoading(false);
    }

    loadSession();
  }, [slug, sessionId]);

  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((p) => p.gamesPlayed > 0)
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
        return a.playerName.localeCompare(b.playerName);
      });
  }, [players]);

  const getWinRate = (player: SessionPlayer) => {
    if (player.gamesPlayed === 0) return 0;
    return Math.round((player.wins / player.gamesPlayed) * 100);
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    setIsSharing(true);
    try {
      const blob = await captureElement(cardRef.current);
      await shareImage(blob, `${sharePlayer?.playerName}'s PickleQ Stats`);
      trackStatsShared('session', 'native');
    } catch (err) {
      console.error('Failed to share:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsSharing(true);
    try {
      const blob = await captureElement(cardRef.current);
      downloadImage(blob);
      trackStatsShared('session', 'download');
    } catch (err) {
      console.error('Failed to download:', err);
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏓</div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !venue || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Session Not Found'}
          </h1>
          <p className="text-gray-600">
            This session link may be invalid or expired. Check the URL and try again.
          </p>
          <a
            href={`/venue/${slug}`}
            className="inline-block mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            View venue leaderboard →
          </a>
        </div>
      </div>
    );
  }

  const totalGames = session.totalGames || sortedPlayers.reduce((sum, p) => sum + p.gamesPlayed, 0) / 2;
  const totalPlayers = sortedPlayers.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-2">🏓</div>
          <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
          <p className="text-gray-600 text-sm">Session Results</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8">
        {/* Session Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="text-center mb-4">
            <div className="text-lg font-semibold text-gray-900">{session.location}</div>
            <div className="text-sm text-gray-500">{formatDate(session.endedAt)}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalPlayers}</div>
              <div className="text-sm text-gray-500">Players</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(totalGames)}</div>
              <div className="text-sm text-gray-500">Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{session.courts}</div>
              <div className="text-sm text-gray-500">Courts</div>
            </div>
          </div>
        </div>

        {/* Find yourself prompt */}
        <div className="bg-green-100 rounded-xl p-4 mb-6 text-center">
          <p className="text-green-800">
            <span className="font-semibold">Tap your name</span> to share your session stats!
          </p>
        </div>

        {/* Session Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Session Rankings</h2>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">🏓</div>
              <p className="text-lg">No games recorded</p>
              <p className="text-sm mt-1">This session has no game data.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedPlayers.map((player, index) => {
                const medal = getMedal(index);
                const winRate = getWinRate(player);
                const isTopThree = index < 3;

                return (
                  <button
                    key={player.id}
                    onClick={() => setSharePlayer(player)}
                    className={`
                      w-full flex items-center gap-4 px-4 py-4 text-left
                      ${isTopThree ? 'bg-green-50' : 'hover:bg-gray-50'}
                      transition-colors
                    `}
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {medal ? (
                        <span className="text-2xl">{medal}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold truncate ${
                            isTopThree ? 'text-lg' : 'text-base'
                          } text-gray-900`}
                        >
                          {player.playerName}
                        </span>
                        {player.skill && (
                          <span className="text-sm text-gray-500">
                            <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>{' '}
                            {getSkillLabel(player.skill)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.wins}W - {player.losses}L
                        <span className="mx-1">•</span>
                        {player.gamesPlayed} games
                      </div>
                    </div>

                    {/* Wins (primary stat) */}
                    <div className="text-right">
                      <div
                        className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} text-green-600`}
                      >
                        {player.wins}
                      </div>
                      <div className="text-xs text-gray-400">WINS</div>
                    </div>

                    {/* Win Rate (secondary) */}
                    <div className="text-right w-14 self-end">
                      <div className={`font-semibold text-sm ${winRate >= 50 ? 'text-gray-600' : 'text-gray-400'}`}>
                        {winRate}%
                      </div>
                      <div className="text-xs text-gray-400">WIN %</div>
                    </div>

                    {/* Share indicator */}
                    <div className="text-gray-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Link to full leaderboard */}
        <div className="mt-6 text-center">
          <a
            href={`/venue/${slug}`}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            View all-time leaderboard →
          </a>
        </div>

        {/* Branding */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold">PickleQ</span>
          </p>
        </div>
      </main>

      {/* Share Modal */}
      {sharePlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 pb-safe">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Share Stats</h3>
              <button
                onClick={() => setSharePlayer(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Preview - scaled for display, constrained height so buttons are always visible */}
            <div className="flex justify-center mb-4 overflow-hidden h-[300px]">
              <div className="transform scale-[0.60] origin-top">
                <PlayerStatsCard
                  name={sharePlayer.playerName}
                  skill={sharePlayer.skill}
                  wins={sharePlayer.wins}
                  losses={sharePlayer.losses}
                  gamesPlayed={sharePlayer.gamesPlayed}
                  venueName={venue.name}
                  location={session.location}
                  date={formatDate(session.endedAt)}
                  rank={sortedPlayers.findIndex(p => p.id === sharePlayer.id) + 1}
                  totalPlayers={totalPlayers}
                />
              </div>
            </div>

            {/* Hidden card for capturing - rendered at full size with Instagram-friendly dimensions */}
            <div className="absolute -left-[9999px]">
              <PlayerStatsCard
                ref={cardRef}
                name={sharePlayer.playerName}
                skill={sharePlayer.skill}
                wins={sharePlayer.wins}
                losses={sharePlayer.losses}
                gamesPlayed={sharePlayer.gamesPlayed}
                venueName={venue.name}
                location={session.location}
                date={formatDate(session.endedAt)}
                rank={sortedPlayers.findIndex(p => p.id === sharePlayer.id) + 1}
                totalPlayers={totalPlayers}
                forSharing={true}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {canNativeShare() ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex-1"
                >
                  {isSharing ? 'Sharing...' : 'Share'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownload}
                  disabled={isSharing}
                  className="flex-1"
                >
                  {isSharing ? 'Saving...' : 'Save Image'}
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setSharePlayer(null)}
                className="flex-1"
              >
                Close
              </Button>
            </div>

            {!canNativeShare() && (
              <p className="text-center text-sm text-gray-500 mt-3">
                Save the image and share it on your favorite platform!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
