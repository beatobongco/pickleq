import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'team1' | 'team2' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantClasses = {
  primary: 'bg-green-600 hover:bg-green-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  team1: 'bg-[#1976D2] hover:bg-[#1565C0] text-white',
  team2: 'bg-[#F57C00] hover:bg-[#EF6C00] text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
};

const sizeClasses = {
  sm: 'min-h-[44px] px-3 py-2 text-sm',
  md: 'min-h-[52px] px-4 py-3 text-base',
  lg: 'min-h-[60px] px-6 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-xl font-semibold
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
        touch-manipulation
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
