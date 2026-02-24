import { ReactNode } from 'react';

interface LabelProps {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}

export function Label({ htmlFor, children, required = false }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
