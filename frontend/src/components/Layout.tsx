/**
 * Layout — public page shell.
 *
 * Renders:
 *  - A slim fixed navigation bar (logo-left, register CTA-right)
 *  - A <main> slot for page content
 *  - A footer with copyright and links
 */

import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isRegisterPage = pathname.startsWith("/register");

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="relative w-full z-40">
        <img 
          src="/proper-dimension.webp" 
          alt="Navigation Background" 
          className="w-full h-auto block"
        />
        
        <div 
          className="absolute inset-0" 
          style={{
            background: "linear-gradient(to right, rgba(28, 110, 134, 0.85) 0%, rgba(28, 110, 134, 0.2) 100%)"
          }}
        />

        <nav
          className="absolute inset-0 mx-auto flex w-full max-w-6xl items-center justify-between px-5"
          aria-label="Main navigation"
        >
          {/* Logo / wordmark */}
          <Link
            to="/"
            id="nav-logo"
            className="flex items-center gap-2.5 no-underline"
            aria-label="IYC Camp Meeting 2026 — Home"
          >
            <span
              className="flex items-center justify-center w-9 h-9 rounded-full text-primary font-bold text-sm font-sans"
              style={{ background: "var(--color-ice)" }}
              aria-hidden="true"
            >
              IYC
            </span>
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="text-white font-semibold text-sm font-sans tracking-wide">
                Camp Meeting
              </span>
              <span
                className="text-xs font-sans"
                style={{ color: "var(--color-ice)" }}
              >
                2026
              </span>
            </span>
          </Link>

          {/* CTA — hide on register page to avoid duplication */}
          {!isRegisterPage && (
            <Link
              to="/register"
              id="nav-register-btn"
              className="rounded-full font-sans font-semibold text-sm px-5 py-2 transition-all duration-200 hover:scale-[1.03]"
              style={{
                background: "var(--color-ice)",
                color: "var(--color-primary)",
                boxShadow: "0 0 20px rgba(216,245,249,0.2)",
              }}
            >
              Register Free
            </Link>
          )}
        </nav>
      </header>

      {/* ── Page content ───────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="mt-auto py-8 px-5 text-center font-sans text-sm"
        style={{
          borderTop: "1px solid rgba(103,163,177,0.2)",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <p>
          © {CURRENT_YEAR} International Youth For Christ. All rights
          reserved.
        </p>
        <p className="mt-1" style={{ color: "rgba(216,245,249,0.6)" }}>
          The Rain of His Spirit &mdash; 23–26 December
        </p>
      </footer>
    </div>
  );
}
