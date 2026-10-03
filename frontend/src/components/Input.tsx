/**
 * Input — styled text input for all public and admin forms.
 *
 * Forwards all native <input> attributes; adds branded styling and an
 * optional leading icon slot.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, leadingIcon, className = "", ...rest }, ref) => {
    return (
      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          {...rest}
          className={[
            "w-full rounded-xl bg-white/10 border text-white placeholder-white/40",
            "px-4 py-3 text-base font-sans",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-ice/60 focus:border-ice/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-red-400 focus:ring-red-400/60 focus:border-red-400/60"
              : "border-highlight/40 hover:border-highlight/70",
            leadingIcon ? "pl-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
