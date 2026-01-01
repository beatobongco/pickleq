import type { SkillLevel } from '../types';

interface SkillSelectorProps {
  skill: SkillLevel;
  onChange: (skill: SkillLevel) => void;
  size?: 'sm' | 'md';
}

export function SkillSelector({ skill, onChange, size = 'md' }: SkillSelectorProps) {
  const handleClick = () => {
    // Cycle through: null -> 1 -> 2 -> 3 -> null
    const next: SkillLevel = skill === null ? 1 : skill === 3 ? null : ((skill + 1) as SkillLevel);
    onChange(next);
  };

  const starSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation ${starSize}`}
      title={skill === null ? 'Set skill level' : `Skill: ${skill}/3`}
      aria-label={skill === null ? 'Set skill level' : `Skill level ${skill} of 3, click to change`}
    >
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={level <= (skill ?? 0) ? 'text-yellow-500' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
    </button>
  );
}
