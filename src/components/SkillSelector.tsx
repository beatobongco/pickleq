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
  const handleClick = () => {
    // Cycle through: null -> 1 -> 2 -> 3 -> null
    const next: SkillLevel = skill === null ? 1 : skill === 3 ? null : ((skill + 1) as SkillLevel);
    onChange(next);
  };

  const starSize = size === 'sm' ? 'text-base' : 'text-lg';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const label = getSkillLabel(skill);

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation`}
      title={skill === null ? 'Set skill level' : `Skill: ${label}`}
      aria-label={skill === null ? 'Set skill level' : `Skill level: ${label}, click to change`}
    >
      <span className={`flex gap-0.5 ${starSize}`}>
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={level <= (skill ?? 0) ? 'text-yellow-500' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
      </span>
      <span className={`${textSize} ${skill === null ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </span>
    </button>
  );
}
