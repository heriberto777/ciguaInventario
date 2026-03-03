import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-semibold rounded transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] font-bold shadow-sm',
    secondary: 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border-default)] font-bold shadow-sm border border-[var(--border-default)]',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 font-bold shadow-sm',
    success: 'bg-[var(--color-success)] text-white hover:opacity-90 font-bold shadow-sm',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
