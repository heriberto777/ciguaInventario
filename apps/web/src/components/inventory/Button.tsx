import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const baseStyles = 'font-semibold rounded transition-colors duration-200';

    const variantStyles = {
      primary: 'bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white',
      secondary: 'bg-[var(--bg-hover)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border border-[var(--border-default)]',
      danger: 'bg-[var(--danger-600)] hover:bg-[var(--danger-700)] text-white',
      success: 'bg-[var(--success-600)] hover:bg-[var(--success-700)] text-white',
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
export default Button;
