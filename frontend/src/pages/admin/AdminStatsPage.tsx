/**
 * Admin Stats page — /admin/dashboard
 *
 * Displays 4 stat cards: total registered, checked in, walk-ins,
 * pending testimonials. Auto-refreshes every 30 s.
 */

import { useAdminStats } from "../../lib/queries";

interface StatCardProps {
  icon: string;
  label: string;
  value: number | undefined;
  loading: boolean;
  accent?: string;
}

function StatCard({ icon, label, value, loading, accent = "var(--color-ice)" }: StatCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(103,163,177,0.2)",
        borderRadius: "1.25rem",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        backdropFilter: "blur(8px)",
        minHeight: 130,
      }}
    >
      <span style={{ fontSize: "1.75rem" }} aria-hidden="true">{icon}</span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: loading ? "1.5rem" : "2.5rem",
            color: accent,
            lineHeight: 1,
            textShadow: `0 0 24px ${accent}55`,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }}
        >
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: 48,
                height: 16,
                borderRadius: 8,
                background: "rgba(255,255,255,0.1)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          ) : (
            (value ?? 0).toLocaleString()
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.5)",
            marginTop: "0.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export function AdminStatsPage() {
  const { data, isLoading } = useAdminStats();

  return (
    <div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.75rem",
            color: "var(--color-ice)",
            marginBottom: "0.25rem",
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem", color: "rgba(255,255,255,0.45)" }}>
          Live summary — refreshes every 30 seconds
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <StatCard
          icon="🧑‍🤝‍🧑"
          label="Total Registered"
          value={data?.total_registered}
          loading={isLoading}
          accent="var(--color-ice)"
        />
        <StatCard
          icon="✅"
          label="Checked In"
          value={data?.checked_in}
          loading={isLoading}
          accent="#86efac"
        />
        <StatCard
          icon="🚶"
          label="Walk-ins"
          value={data?.walk_ins}
          loading={isLoading}
          accent="var(--color-cream)"
        />
        <StatCard
          icon="💬"
          label="Pending Testimonials"
          value={data?.pending_testimonials}
          loading={isLoading}
          accent="#fbbf24"
        />
      </div>

      {/* Quick links */}
      <div
        style={{
          marginTop: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          { href: "/admin/registrations", icon: "🔍", label: "Search registrants" },
          { href: "/admin/registrations", icon: "📥", label: "Export CSV" },
          { href: "/admin/settings", icon: "🔒", label: "Open / close registration" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              borderRadius: "1rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(103,163,177,0.15)",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              transition: "all 0.15s",
              minHeight: 56,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(216,245,249,0.08)";
              e.currentTarget.style.color = "var(--color-ice)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
