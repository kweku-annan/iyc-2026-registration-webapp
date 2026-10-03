/**
 * Button — primary shared component.
 *
 * Variants:
 *   primary   — ice-coloured CTA (default)
 *   secondary — ghost / outlined
 *   danger    — destructive red-tinted action
 */

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold " +
  "transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ice " +
  "focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed " +
  "select-none cursor-pointer";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ice text-primary shadow-[0_0_30px_rgba(216,245,249,0.25)] " +
    "hover:shadow-[0_0_50px_rgba(216,245,249,0.45)] hover:scale-[1.03] active:scale-[0.98]",
  secondary:
    "border border-highlight text-ice bg-transparent " +
    "hover:bg-highlight/20 active:bg-highlight/30",
  danger:
    "bg-red-500/20 border border-red-400 text-red-200 " +
    "hover:bg-red-500/30 active:bg-red-600/30",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
