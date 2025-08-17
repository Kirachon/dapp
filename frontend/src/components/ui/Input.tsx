import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    onRightIconClick,
    disabled,
    required,
    ...props 
  }, ref) => {
    const inputId = React.useId();
    const errorId = React.useId();
    const helperTextId = React.useId();

    const baseInputStyles = `
      w-full px-4 py-3 text-base
      bg-white border-2 rounded-lg
      transition-all duration-200
      placeholder:text-[var(--color-text-muted)]
      focus:outline-none focus:ring-0
      disabled:bg-[var(--color-gray-50)] disabled:cursor-not-allowed
      disabled:text-[var(--color-text-muted)]
    `;

    const inputVariants = {
      default: `
        border-[var(--color-border)]
        focus:border-[var(--color-border-focus)]
        focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]
      `,
      error: `
        border-[var(--color-primary-600)] bg-[var(--color-primary-50)]
        focus:border-[var(--color-primary-600)]
        focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]
      `
    };

    const currentVariant = error ? 'error' : 'default';

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
          >
            {label}
            {required && <span className="text-[var(--color-primary-500)] ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            type={type}
            className={cn(
              baseInputStyles,
              inputVariants[currentVariant],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              helperText && helperTextId
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              onClick={onRightIconClick}
              tabIndex={-1}
            >
              {rightIcon}
            </button>
          )}
        </div>
        
        {error && (
          <p 
            id={errorId}
            className="mt-2 text-sm text-[var(--color-primary-600)] flex items-center gap-1"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={helperTextId}
            className="mt-2 text-sm text-[var(--color-text-secondary)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
