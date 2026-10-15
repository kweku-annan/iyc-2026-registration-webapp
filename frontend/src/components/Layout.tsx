/**
 * Layout — public page shell.
 *
 * Renders:
 *  - A slim fixed navigation bar (logo-left, register CTA-right)
 *  - A <main> slot for page content
 *  - A footer with copyright and links
 */

import { type ReactNode, useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { SOCIAL } from "../sections/ContactSection";

const CURRENT_YEAR = new Date().getFullYear();

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isRegisterPage = pathname.startsWith("/register");

  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        // The sticky nav slides in when the user reaches the end of the background image
        // We use 80px as a threshold so it appears right as the image is leaving the screen
        if (rect.bottom <= 80) {
          setIsSticky(true);
        } else {
          setIsSticky(false);
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial scroll position
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navContent = (
    <>
      {/* Logo / wordmark */}
      <Link
        to="/"
        id="nav-logo"
        className="flex items-center gap-2.5 no-underline"
        aria-label="IYC Camp Meeting 2026 — Home"
      >
        <img
          src="/iyc-logo.jpeg"
          alt="IYC Logo"
          className="w-10 h-10 rounded-full object-cover border-2 shadow-md"
          style={{ borderColor: "var(--color-ice)" }}
        />
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!pathname.startsWith("/donate") && (
          <Link
            to="/donate"
            className="rounded-full font-sans font-bold transition-all duration-200 hover:scale-[1.03] text-sm px-4 py-2 sm:px-5 donate-nav-btn"
            style={{
              border: "1px solid rgba(103,163,177,0.5)",
              color: "var(--color-ice)",
              background: "rgba(103,163,177,0.1)",
            }}
          >
            💝 Donate
          </Link>
        )}
        {!isRegisterPage && (
          <Link
            to="/register"
            id="nav-register-btn"
            className="rounded-full font-sans font-semibold transition-all duration-200 hover:scale-[1.03] text-sm px-4 py-2 sm:px-5"
            style={{
              background: "var(--color-ice)",
              color: "var(--color-primary)",
              boxShadow: "0 0 20px rgba(216,245,249,0.2)",
            }}
          >
            Register Free
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-dvh flex flex-col">
      
      {/* ── Fixed Sticky Nav ──
           • Mobile: always visible (banner stays clean)
           • Desktop: slides in only after scrolling past the hero header
      ── */}
      <div 
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isSticky
            ? "translate-y-0 opacity-100"
            : "md:-translate-y-full md:opacity-0 md:pointer-events-none translate-y-0 opacity-100"
        }`}
        style={{
          background: "rgba(28, 110, 134, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(103,163,177,0.25)",
        }}
      >
        <nav
          className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3"
          aria-label="Sticky navigation"
        >
          {navContent}
        </nav>
      </div>

      {/* ── Nav & Header ────────────────────────────────────────────── */}
      {/* On mobile the header banner is purely decorative — no overlay buttons */}
      <header ref={headerRef} className="relative w-full z-40 mt-[56px] md:mt-0">
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

        {/* Overlay nav: desktop only — fades out when sticky nav takes over */}
        <nav
          className={`hidden md:flex absolute inset-0 mx-auto w-full max-w-6xl items-center justify-between px-5 transition-opacity duration-300 ${isSticky ? "opacity-0" : "opacity-100"}`}
          aria-label="Main navigation"
        >
          {navContent}
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
        <div className="flex justify-center gap-6 mb-6">
          {SOCIAL.map((s) => (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <span aria-hidden="true">{s.icon}</span>
            </a>
          ))}
        </div>
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
