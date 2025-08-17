import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled,
    icon,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 
      font-semibold rounded-lg transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-60 disabled:cursor-not-allowed
      touch-optimized
    `;

    const variants = {
      primary: `
        bg-[var(--color-primary-500)] text-white
        hover:bg-[var(--color-primary-600)] floating-shadow hover:-translate-y-0.5
        focus-visible:ring-[var(--color-primary-500)]
        active:bg-[var(--color-primary-700)] active:translate-y-0
        disabled:bg-[var(--color-gray-400)] disabled:hover:bg-[var(--color-gray-400)]
        disabled:hover:shadow-none disabled:hover:translate-y-0
      `,
      secondary: `
        bg-transparent text-[var(--color-text-primary)]
        border-2 border-[var(--color-border)]
        hover:bg-[var(--color-surface)] hover:border-[var(--color-gray-300)]
        focus-visible:ring-[var(--color-primary-500)]
        active:bg-[var(--color-gray-100)]
        disabled:text-[var(--color-text-muted)] disabled:border-[var(--color-gray-200)]
      `,
      outline: `
        bg-transparent text-[var(--color-primary-500)]
        border-2 border-[var(--color-primary-500)]
        hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-600)]
        focus-visible:ring-[var(--color-primary-500)]
        active:bg-[var(--color-primary-100)]
        disabled:text-[var(--color-text-muted)] disabled:border-[var(--color-gray-200)]
      `,
      ghost: `
        bg-transparent text-[var(--color-text-primary)]
        hover:bg-[var(--color-surface)]
        focus-visible:ring-[var(--color-primary-500)]
        active:bg-[var(--color-gray-100)]
        disabled:text-[var(--color-text-muted)]
      `
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-8 py-4 text-lg min-h-[52px]'
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
