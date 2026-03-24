import React from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-[#b04a34] active:bg-[#9e4230] shadow-sm',
  ghost:
    'bg-transparent text-ink hover:bg-paper-section active:bg-border',
  outline:
    'bg-transparent text-ink border border-border hover:bg-paper-section active:bg-border',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3 text-base rounded-xl gap-2',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className = '',
  ...props
}) => (
  <button
    className={`
      inline-flex items-center justify-center font-medium
      transition-all duration-200 ease-out
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading && <Spinner size="sm" />}
    {children}
  </button>
);

export default Button;
