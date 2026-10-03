/**
 * Admin dashboard shell — /admin/*
 *
 * Layout:
 *  - Fixed sidebar on desktop (≥768px): logo, nav links, logout
 *  - Hamburger slide-out drawer on mobile
 *  - Top bar: page title + mobile menu toggle
 *  - <Outlet /> renders child routes
 */

import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "../../lib/adminAuth";

const DARK = "#0a1a20";
const SIDEBAR_BG = "#0d2129";
const SIDEBAR_W = 220;

const NAV_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/admin/registrations", label: "Registrants", icon: "🧑‍🤝‍🧑" },
  { to: "/admin/settings", label: "Settings", icon: "⚙️" },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAdminAuth();

  return (
    <aside
      style={{
        width: SIDEBAR_W,
        background: SIDEBAR_BG,
        borderRight: "1px solid rgba(103,163,177,0.15)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 0",
        gap: 0,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid rgba(103,163,177,0.12)" }}>
        <Link
          to="/admin/dashboard"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}
          onClick={onClose}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--color-ice)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: "0.75rem",
              flexShrink: 0,
            }}
          >
            IYC
          </span>
          <div>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "0.875rem", color: "white" }}>
              Admin Panel
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", color: "var(--color-highlight)" }}>
              IYC-2026
            </div>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav
        style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}
        aria-label="Admin navigation"
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.625rem",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--color-ice)" : "rgba(255,255,255,0.6)",
              background: isActive ? "rgba(216,245,249,0.1)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
              minHeight: 44, // large touch target
            })}
          >
            <span aria-hidden="true" style={{ fontSize: "1rem" }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid rgba(103,163,177,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.45)",
            wordBreak: "break-all",
          }}
        >
          {user.email}
          <span
            style={{
              marginLeft: "0.375rem",
              background: "rgba(103,163,177,0.2)",
              color: "var(--color-highlight)",
              padding: "0.1em 0.45em",
              borderRadius: 999,
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {user.role}
          </span>
        </div>
        <button
          id="admin-logout-btn"
          onClick={() => void logout()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.5)",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.15s",
            minHeight: 40,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.12)";
            e.currentTarget.style.color = "#fca5a5";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <span aria-hidden="true">→</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

function AdminShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: DARK, color: "white" }}>
      {/* noindex */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Desktop sidebar */}
      <div
        style={{ display: "flex", flexShrink: 0 }}
        className="hidden md:flex"
      >
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div style={{ position: "relative", zIndex: 1, width: SIDEBAR_W, height: "100%" }}>
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar (mobile) */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.875rem 1.25rem",
            background: SIDEBAR_BG,
            borderBottom: "1px solid rgba(103,163,177,0.12)",
          }}
          className="flex md:hidden"
        >
          <button
            id="admin-menu-btn"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{ display: "block", width: 20, height: 2, background: "currentColor", borderRadius: 2 }}
              />
            ))}
          </button>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem",
              color: "var(--color-ice)",
            }}
          >
            IYC-2026 Admin
          </span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Wraps the admin shell with the auth provider. */
export function AdminDashboard() {
  return (
    <AdminAuthProvider>
      <AdminShell />
    </AdminAuthProvider>
  );
}
