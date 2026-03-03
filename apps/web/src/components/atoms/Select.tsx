import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    function Select({ label, error, options, className = '', ...props }, ref) {
        return (
            <div className="flex flex-col gap-1 w-full text-secondary">
                {label && (
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    className={`
            px-3 py-2 border rounded-lg transition-all
            bg-[var(--bg-input)] text-[var(--text-primary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]
            disabled:opacity-50 disabled:bg-[var(--bg-hover)]
            border-[var(--border-default)]
            ${error ? 'border-[var(--color-danger)]' : 'border-[var(--border-default)]'}
            ${className}
          `}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <span className="text-xs text-[var(--color-danger)] mt-1">{error}</span>}
            </div>
        );
    }
);

Select.displayName = 'Select';
