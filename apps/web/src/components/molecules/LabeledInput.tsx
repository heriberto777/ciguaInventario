import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { FieldError } from 'react-hook-form';
import { forwardRef } from 'react';

interface LabeledInputProps {
  label: string;
  placeholder?: string;
  error?: FieldError;
  required?: boolean;
  type?: string;
  [key: string]: any;
}

export const LabeledInput = forwardRef<HTMLInputElement, LabeledInputProps>(
  function LabeledInput(
    { label, error, required = false, type = 'text', ...props },
    ref
  ) {
    const id = props.name || label.toLowerCase();

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
        <Input
          ref={ref}
          id={id}
          type={type}
          error={error?.message}
          {...props}
        />
      </div>
    );
  }
);
