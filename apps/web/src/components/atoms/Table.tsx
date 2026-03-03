import { ReactNode } from 'react';

interface TableProps {
    headers: ReactNode[];
    children: ReactNode;
    className?: string;
    containerClassName?: string;
}

export function Table({ headers, children, className = '', containerClassName = '' }: TableProps) {
    return (
        <div className={`overflow-x-auto rounded-lg border border-[var(--border-default)] shadow-sm ${containerClassName}`}>
            <table className={`w-full text-sm text-left ${className}`}>
                <thead className="bg-[var(--bg-hover)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border-default)]">
                    <tr>
                        {headers.map((header, i) => (
                            <th key={i} className="px-6 py-4 font-semibold">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)]">
                    {children}
                </tbody>
            </table>
        </div>
    );
}

export function TableRow({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
    return (
        <tr
            className={`hover:bg-[var(--bg-hover)] transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </tr>
    );
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <td className={`px-6 py-4 whitespace-nowrap ${className}`}>{children}</td>;
}
