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
  // Optional lifetime stats for session view
  lifetimeStats?: {
    wins: number;
    losses: number;
    gamesPlayed: number;
  };
}

export const PlayerStatsCard = forwardRef<HTMLDivElement, PlayerStatsCardProps>(
  ({ name, skill, wins, losses, gamesPlayed, winStreak, location, venueName, date, lifetimeStats }, ref) => {
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const lifetimeWinRate = lifetimeStats && lifetimeStats.gamesPlayed > 0
      ? Math.round((lifetimeStats.wins / lifetimeStats.gamesPlayed) * 100)
      : 0;
    const isSessionView = !!lifetimeStats;

    return (
      <div
        ref={ref}
        className="w-[360px] bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold tracking-wide">PickleQ</div>
          {isSessionView && (
            <div className="text-sm text-white/70 mt-1">Session Results</div>
          )}
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

        {/* Session Stats (primary) */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          {isSessionView && (
            <div className="text-center text-xs text-white/50 uppercase tracking-wider mb-3">
              Today's Session
            </div>
          )}
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

        {/* Lifetime Stats (secondary) - only show when session view */}
        {lifetimeStats && lifetimeStats.gamesPlayed > 0 && (
          <div className="bg-white/5 rounded-xl p-3 mb-4">
            <div className="text-center text-xs text-white/50 uppercase tracking-wider mb-2">
              All-Time at Venue
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-white/90">{lifetimeWinRate}%</div>
                <div className="text-xs text-white/50">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-300/80">{lifetimeStats.wins}W</div>
                <div className="text-xs text-white/50">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-300/80">{lifetimeStats.losses}L</div>
                <div className="text-xs text-white/50">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white/80">{lifetimeStats.gamesPlayed}</div>
                <div className="text-xs text-white/50">Games</div>
              </div>
            </div>
          </div>
        )}

        {/* Venue, Location & Date */}
        {(venueName || location || date) && (
          <div className="text-center text-white/60 text-sm mb-4">
            {venueName && <div className="font-semibold text-white/80">{venueName}</div>}
            {location && !venueName && <div>@ {location}</div>}
            {location && venueName && location !== venueName && (
              <div className="text-xs">@ {location}</div>
            )}
            {date && <div className="text-xs">{date}</div>}
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
