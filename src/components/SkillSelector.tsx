import type { SkillLevel } from '../types';

interface SkillSelectorProps {
  skill: SkillLevel;
  onChange: (skill: SkillLevel) => void;
  size?: 'sm' | 'md';
}

export function getSkillLabel(skill: SkillLevel): string {
  switch (skill) {
    case 1: return 'Beginner';
    case 2: return 'Intermediate';
    case 3: return 'Advanced';
    default: return 'Set skill';
  }
}

export function SkillSelector({ skill, onChange, size = 'md' }: SkillSelectorProps) {
  const handleStarClick = (level: 1 | 2 | 3) => {
    // If clicking the same level that's currently set, clear it
    if (skill === level) {
      onChange(null);
    } else {
      onChange(level);
    }
  };

  const starSize = size === 'sm' ? 'text-base' : 'text-lg';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const label = getSkillLabel(skill);

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
      title={skill === null ? 'Set skill level' : `Skill: ${label}`}
    >
      <span className={`flex gap-0.5 ${starSize}`}>
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => handleStarClick(level)}
            className="touch-manipulation hover:scale-110 transition-transform"
            aria-label={`Set skill to ${getSkillLabel(level)}`}
          >
            <span className={level <= (skill ?? 0) ? 'text-yellow-500' : 'text-gray-300'}>
              ★
            </span>
          </button>
        ))}
      </span>
      <span className={`${textSize} w-20 ${skill === null ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
}
