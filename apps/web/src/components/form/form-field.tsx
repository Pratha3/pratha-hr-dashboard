import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  helpText,
  className,
  children
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive animate-in fade-in-50 duration-150">
          {error}
        </p>
      ) : helpText ? (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      ) : null}
    </div>
  );
}
