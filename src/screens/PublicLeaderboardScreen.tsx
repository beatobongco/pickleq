import { useEffect, useState, useMemo } from 'react';
import { getVenueBySlug, getVenuePlayers } from '../utils/supabase';
import { getSkillLabel } from '../components/SkillSelector';
import { ShareModal } from '../components/ShareModal';
import type { Venue, VenuePlayer } from '../types';

interface PublicLeaderboardScreenProps {
  slug: string;
}

export function PublicLeaderboardScreen({ slug }: PublicLeaderboardScreenProps) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [players, setPlayers] = useState<VenuePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharePlayer, setSharePlayer] = useState<VenuePlayer | null>(null);

  useEffect(() => {
    async function loadVenue() {
      setLoading(true);
      setError(null);

      const venueData = await getVenueBySlug(slug);
      if (!venueData) {
        setError('Venue not found');
        setLoading(false);
        return;
      }

      setVenue(venueData);

      const playersData = await getVenuePlayers(venueData.id);
      setPlayers(playersData);
      setLoading(false);
    }

    loadVenue();
  }, [slug]);

  const MIN_GAMES_FOR_RANKING = 10;

  const { rankedPlayers, unrankedPlayers } = useMemo(() => {
    const activePlayers = [...players]
      .filter((p) => p.lifetimeGames > 0)
      .sort((a, b) => {
        // Primary: Win percentage (higher = better)
        const aWinRate = a.lifetimeGames > 0 ? a.lifetimeWins / a.lifetimeGames : 0;
        const bWinRate = b.lifetimeGames > 0 ? b.lifetimeWins / b.lifetimeGames : 0;
        if (bWinRate !== aWinRate) return bWinRate - aWinRate;
        // Tiebreaker 1: More games played (larger sample = more credible)
        if (b.lifetimeGames !== a.lifetimeGames) return b.lifetimeGames - a.lifetimeGames;
        // Tiebreaker 2: Alphabetical
        return a.name.localeCompare(b.name);
      });

    return {
      rankedPlayers: activePlayers.filter(p => p.lifetimeGames >= MIN_GAMES_FOR_RANKING),
      unrankedPlayers: activePlayers.filter(p => p.lifetimeGames < MIN_GAMES_FOR_RANKING),
    };
  }, [players]);

  const getWinRate = (player: VenuePlayer) => {
    if (player.lifetimeGames === 0) return 0;
    return Math.round((player.lifetimeWins / player.lifetimeGames) * 100);
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏓</div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue Not Found</h1>
          <p className="text-gray-600">
            We couldn't find a venue with the URL "{slug}". Please check the link and
            try again.
          </p>
        </div>
      </div>
    );
  }

  const totalGames = players.reduce((sum, p) => sum + p.lifetimeGames, 0);
  const totalPlayers = players.filter((p) => p.lifetimeGames > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
          <p className="text-gray-600 text-sm">Leaderboard</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-8">
        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalPlayers}</div>
              <div className="text-sm text-gray-500">Players</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalGames}</div>
              <div className="text-sm text-gray-500">Total Games</div>
            </div>
          </div>
        </div>

        {/* Find yourself prompt */}
        <div className="bg-green-100 rounded-xl p-4 mb-6 text-center">
          <p className="text-green-800">
            <span className="font-semibold">Tap your name</span> to share your stats!
          </p>
        </div>

        {/* Ranked Leaderboard */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-700">Rankings</h2>
          </div>

          {rankedPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-lg">No ranked players yet</p>
              <p className="text-sm mt-1">Play {MIN_GAMES_FOR_RANKING}+ games to get ranked</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rankedPlayers.map((player, index) => {
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
                        <span className="text-lg font-bold text-gray-400">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold truncate ${isTopThree ? 'text-lg' : 'text-base'} text-gray-900`}
                        >
                          {player.name}
                        </span>
                        {player.skill && (
                          <span className="text-sm text-gray-500">
                            <span className="text-yellow-500">
                              {'★'.repeat(player.skill)}
                            </span>{' '}
                            {getSkillLabel(player.skill)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.lifetimeWins}W - {player.lifetimeLosses}L
                        <span className="mx-1">•</span>
                        {player.lifetimeGames} games
                      </div>
                    </div>

                    {/* Win Rate (primary stat for all-time) */}
                    <div className="text-right">
                      <div
                        className={`font-bold ${isTopThree ? 'text-2xl' : 'text-xl'} ${winRate >= 50 ? 'text-green-600' : 'text-gray-600'}`}
                      >
                        {winRate}%
                      </div>
                      <div className="text-xs text-gray-400">WIN RATE</div>
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

        {/* Unranked Players */}
        {unrankedPlayers.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-500">
                Unranked ({unrankedPlayers.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Play {MIN_GAMES_FOR_RANKING} games to get ranked</p>
            </div>

            <div className="divide-y divide-gray-100">
              {unrankedPlayers.map((player) => {
                const winRate = getWinRate(player);
                const gamesNeeded = MIN_GAMES_FOR_RANKING - player.lifetimeGames;

                return (
                  <button
                    key={player.id}
                    onClick={() => setSharePlayer(player)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    {/* Progress indicator */}
                    <div className="w-12 text-center">
                      <span className="text-sm font-medium text-gray-400">
                        {player.lifetimeGames}/{MIN_GAMES_FOR_RANKING}
                      </span>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate text-gray-700">
                          {player.name}
                        </span>
                        {player.skill && (
                          <span className="text-sm text-gray-400">
                            <span className="text-yellow-500">{'★'.repeat(player.skill)}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {player.lifetimeWins}W - {player.lifetimeLosses}L
                        <span className="mx-1">•</span>
                        {gamesNeeded} more to rank
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="text-right">
                      <div className="font-semibold text-gray-400">
                        {winRate}%
                      </div>
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
          </div>
        )}

        {/* Branding */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold">PickleQ</span>
          </p>
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
            wins: sharePlayer.lifetimeWins,
            losses: sharePlayer.lifetimeLosses,
            gamesPlayed: sharePlayer.lifetimeGames,
          }}
          location={venue.name}
        />
      )}
    </div>
  );
}
