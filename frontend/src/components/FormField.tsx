/**
 * FormField — wraps a label, input/control, and an optional error message.
 *
 * Usage:
 *   <FormField label="First Name" error={errors.first_name?.message} htmlFor="first-name">
 *     <Input id="first-name" {...register("first_name")} error={!!errors.first_name} />
 *   </FormField>
 */

import { type ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-ice/90 font-sans"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-300 select-none" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-white/50 font-sans">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300 font-sans">
          {error}
        </p>
      )}
    </div>
  );
}
