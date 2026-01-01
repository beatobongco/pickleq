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
  date?: string;
}

export const PlayerStatsCard = forwardRef<HTMLDivElement, PlayerStatsCardProps>(
  ({ name, skill, wins, losses, gamesPlayed, winStreak, location, date }, ref) => {
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    return (
      <div
        ref={ref}
        className="w-[360px] bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold tracking-wide">PickleQ</div>
        </div>

        {/* Player Name & Skill */}
        <div className="text-center mb-6">
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

        {/* Stats Grid */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
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
            <div className="flex justify-center gap-6 text-center">
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
        </div>

        {/* Location & Date */}
        {(location || date) && (
          <div className="text-center text-white/60 text-sm mb-4">
            {location && <div>@ {location}</div>}
            {date && <div>{date}</div>}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/20">
          <div className="text-white/50 text-sm">pickleq.app</div>
        </div>
      </div>
    );
  }
);

PlayerStatsCard.displayName = 'PlayerStatsCard';
