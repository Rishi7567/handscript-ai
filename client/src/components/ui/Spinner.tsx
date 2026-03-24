import React from 'react';

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-[3px]',
};

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <div
    className={`${sizeMap[size]} rounded-full border-ink/20 border-t-accent animate-spin ${className}`}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
