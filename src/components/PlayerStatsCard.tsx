import { forwardRef } from 'react';
import { getSkillLabel } from './SkillSelector';
import type { SkillLevel } from '../types';

interface PlayerStatsCardProps {
  name: string;
  skill: SkillLevel;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winStreak?: number;
  location?: string;
  venueName?: string;
  date?: string;
  // Ranking info
  rank?: number;
  totalPlayers?: number;
  // Card type: 'session' shows simplified stats, 'alltime' shows full stats
  // Defaults to 'session' when rank is provided for backwards compatibility
  cardType?: 'session' | 'alltime';
  // For sharing: wrap card in a centered container optimized for Instagram
  forSharing?: boolean;
}

export const PlayerStatsCard = forwardRef<HTMLDivElement, PlayerStatsCardProps>(
  ({ name, skill, wins, losses, gamesPlayed, winStreak, location, venueName, date, rank, totalPlayers, cardType, forSharing }, ref) => {
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    const getMedal = (r: number) => {
      if (r === 1) return '🥇';
      if (r === 2) return '🥈';
      if (r === 3) return '🥉';
      return null;
    };

    const medal = rank ? getMedal(rank) : null;
    const hasRank = rank !== undefined && totalPlayers !== undefined;
    // Default to 'session' for backwards compatibility when rank is provided
    const isSessionCard = hasRank && cardType !== 'alltime';

    const card = (
      <div
        className="w-[360px] bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          {venueName ? (
            <div className="text-2xl font-bold tracking-wide">{venueName}</div>
          ) : (
            <div className="text-2xl font-bold tracking-wide">PickleQ</div>
          )}
          {isSessionCard && (
            <div className="text-white/70 text-sm mt-1">Today's Session</div>
          )}
          {cardType === 'alltime' && (
            <div className="text-white/70 text-sm mt-1">All-Time Stats</div>
          )}
        </div>

        {/* Player Name & Skill */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold mb-2">{name}</div>
          {skill && (
            <div className="flex items-center justify-center gap-1">
              <span className="text-yellow-300 text-xl">
                {'★'.repeat(skill)}
                <span className="text-white/30">{'★'.repeat(3 - skill)}</span>
              </span>
              <span className="text-white/80 ml-2">{getSkillLabel(skill)}</span>
            </div>
          )}
        </div>

        {/* Rank - The Main Brag */}
        {hasRank && (
          <div className="text-center mb-6 py-3 bg-white/10 rounded-xl">
            <div className="text-4xl font-bold">
              {medal ? (
                <span>{medal}</span>
              ) : (
                <span>#{rank}</span>
              )}
            </div>
            <div className="text-white/70 text-sm mt-1">
              of {totalPlayers} {cardType === 'alltime' ? 'ranked ' : ''}players
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          {isSessionCard ? (
            // Simplified stats for session cards
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-300">{winRate}%</div>
                <div className="text-sm text-white/70 uppercase tracking-wide">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-300">{wins}</div>
                <div className="text-sm text-white/70 uppercase tracking-wide">Wins</div>
              </div>
            </div>
          ) : (
            // Full stats for all-time cards
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-300">{winRate}%</div>
                  <div className="text-sm text-white/70 uppercase tracking-wide">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{gamesPlayed}</div>
                  <div className="text-sm text-white/70 uppercase tracking-wide">Games</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-center gap-8 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-300">{wins}</div>
                    <div className="text-xs text-white/70 uppercase">Wins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-300">{losses}</div>
                    <div className="text-xs text-white/70 uppercase">Losses</div>
                  </div>
                  {winStreak && winStreak > 1 && (
                    <div>
                      <div className="text-2xl font-bold text-orange-300">{winStreak}</div>
                      <div className="text-xs text-white/70 uppercase">Streak</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/20">
          {/* Location & Date */}
          {(location || date) && (
            <div className="text-white/60 text-sm mb-2">
              {location && location !== venueName && <span>@ {location}</span>}
              {location && location !== venueName && date && <span> • </span>}
              {date && <span>{date}</span>}
            </div>
          )}
          <div className="text-white/50 text-sm">pickleq.app</div>
        </div>
      </div>
    );

    // For sharing: wrap in a container with background for Instagram-friendly dimensions
    if (forSharing) {
      return (
        <div
          ref={ref}
          className="w-[540px] h-[720px] bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 flex items-center justify-center"
        >
          {card}
        </div>
      );
    }

    // Normal display: just the card with ref
    return (
      <div ref={ref}>
        {card}
      </div>
    );
  }
);

PlayerStatsCard.displayName = 'PlayerStatsCard';
