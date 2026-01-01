import type { Player } from '../types';
import { Button } from './Button';
import { SkillSelector } from './SkillSelector';
import type { SkillLevel } from '../types';

interface PlayerCardProps {
  player: Player;
  showSkill?: boolean;
  showActions?: boolean;
  showStats?: boolean;
  onSkillChange?: (skill: SkillLevel) => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onRemove?: () => void;
  courtNumber?: number;
}

const statusColors = {
  'not-here': 'bg-gray-100 border-gray-300',
  'checked-in': 'bg-yellow-50 border-yellow-400',
  'playing': 'bg-green-50 border-green-400',
  'left': 'bg-gray-200 border-gray-400',
};

const statusLabels = {
  'not-here': 'Not Here',
  'checked-in': 'In Queue',
  'playing': 'Playing',
  'left': 'Left',
};

export function PlayerCard({
  player,
  showSkill = true,
  showActions = true,
  showStats = false,
  onSkillChange,
  onCheckIn,
  onCheckOut,
  onRemove,
  courtNumber,
}: PlayerCardProps) {
  const isLeft = player.status === 'left';

  return (
    <div
      className={`
        ${statusColors[player.status]}
        border-2 rounded-xl p-3
        ${isLeft ? 'opacity-60' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`font-semibold text-lg truncate ${isLeft ? 'line-through text-gray-500' : 'text-gray-900'}`}
          >
            {player.name}
          </span>
          {showSkill && onSkillChange && (
            <SkillSelector
              skill={player.skill}
              onChange={onSkillChange}
              size="sm"
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {player.status === 'playing' && courtNumber !== undefined && (
            <span className="bg-green-600 text-white text-sm font-bold px-2 py-1 rounded-lg">
              Court {courtNumber}
            </span>
          )}

          {player.status === 'checked-in' && (
            <span className="bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              {statusLabels[player.status]}
            </span>
          )}

          {showStats && player.gamesPlayed > 0 && (
            <span className="text-sm text-gray-600 font-medium">
              {player.wins}-{player.losses}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3">
          {player.status === 'not-here' && onCheckIn && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCheckIn}
              className="flex-1"
            >
              Check In
            </Button>
          )}

          {player.status === 'checked-in' && onCheckOut && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onCheckOut}
              className="flex-1"
            >
              Check Out
            </Button>
          )}

          {(player.status === 'not-here' || player.status === 'left') && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
