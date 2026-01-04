import { forwardRef } from 'react';
import type { SkillLevel } from '../types';

interface LeaderboardPlayer {
  name: string;
  skill?: SkillLevel;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

interface LeaderboardCardProps {
  players: LeaderboardPlayer[];
  venueName?: string;
  location?: string;
  date?: string;
  totalGames?: number;
  cardType: 'session' | 'alltime';
  forSharing?: boolean;
}

export const LeaderboardCard = forwardRef<HTMLDivElement, LeaderboardCardProps>(
  ({ players, venueName, location, date, totalGames, cardType, forSharing }, ref) => {
    const getMedal = (index: number) => {
      if (index === 0) return '🥇';
      if (index === 1) return '🥈';
      if (index === 2) return '🥉';
      return null;
    };

    const getWinRate = (player: LeaderboardPlayer) => {
      if (player.gamesPlayed === 0) return 0;
      return Math.round((player.wins / player.gamesPlayed) * 100);
    };

    // Show top 5 players max
    const displayPlayers = players.slice(0, 5);

    const card = (
      <div className="w-[360px] bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-5 text-white shadow-2xl">
        {/* Header */}
        <div className="text-center mb-4">
          {venueName ? (
            <div className="text-xl font-bold tracking-wide">{venueName}</div>
          ) : (
            <div className="text-xl font-bold tracking-wide">PickleQ</div>
          )}
          <div className="text-white/70 text-sm mt-1">
            {cardType === 'alltime' ? 'All-Time Leaderboard' : 'Session Results'}
          </div>
        </div>

        {/* Trophy */}
        <div className="text-center mb-4">
          <span className="text-5xl">🏆</span>
        </div>

        {/* Stats Summary */}
        {totalGames !== undefined && (
          <div className="bg-white/10 rounded-xl p-3 mb-4">
            <div className="flex justify-center gap-8 text-center">
              <div>
                <div className="text-2xl font-bold">{players.length}</div>
                <div className="text-xs text-white/70 uppercase">Players</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalGames}</div>
                <div className="text-xs text-white/70 uppercase">Games</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white/10 rounded-xl overflow-hidden mb-4">
          {displayPlayers.map((player, index) => {
            const medal = getMedal(index);
            const isTopThree = index < 3;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  index !== displayPlayers.length - 1 ? 'border-b border-white/10' : ''
                } ${isTopThree ? 'bg-white/5' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {medal ? (
                    <span className="text-lg">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold text-white/50">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${isTopThree ? 'text-base' : 'text-sm'}`}>
                    {player.name}
                  </div>
                  {player.skill && (
                    <div className="text-xs">
                      <span className="text-yellow-300">{'★'.repeat(player.skill)}</span>
                      <span className="text-white/30">{'★'.repeat(3 - player.skill)}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  {cardType === 'session' ? (
                    <>
                      <div className={`font-bold ${isTopThree ? 'text-lg' : 'text-base'} text-green-300`}>
                        {player.wins}
                      </div>
                      <div className="text-xs text-white/50">wins</div>
                    </>
                  ) : (
                    <>
                      <div className={`font-bold ${isTopThree ? 'text-lg' : 'text-base'} text-yellow-300`}>
                        {getWinRate(player)}%
                      </div>
                      <div className="text-xs text-white/50">{player.gamesPlayed} games</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {players.length > 5 && (
            <div className="px-3 py-2 text-center text-sm text-white/50">
              +{players.length - 5} more players
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-white/20">
          {(location || date) && (
            <div className="text-white/60 text-sm mb-2">
              {location && location !== venueName && <span>@ {location}</span>}
              {location && location !== venueName && date && <span> · </span>}
              {date && <span>{date}</span>}
            </div>
          )}
          <a
            href="https://pickleq.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-white/50 text-sm hover:text-white/80 transition-colors"
            onClick={(e) => forSharing && e.preventDefault()}
          >
            <span className="text-base">🏓</span>
            <span>pickleq.app</span>
          </a>
        </div>
      </div>
    );

    // For sharing: wrap in a container with background for Instagram Story dimensions (9:16)
    if (forSharing) {
      return (
        <div
          ref={ref}
          className="w-[540px] h-[960px] bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center"
        >
          {card}
        </div>
      );
    }

    return (
      <div ref={ref}>
        {card}
      </div>
    );
  }
);

LeaderboardCard.displayName = 'LeaderboardCard';
