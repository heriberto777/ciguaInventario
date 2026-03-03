import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg border border-[var(--border-default)] shadow-sm p-6 ${className}`}>
      {title && <h2 className="text-xl font-bold mb-4 border-b border-[var(--border-default)] pb-2">{title}</h2>}
      {children}
    </div>
  );
}
