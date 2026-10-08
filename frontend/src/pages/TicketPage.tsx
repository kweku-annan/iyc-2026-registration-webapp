/**
 * Ticket page — /ticket/:token
 *
 * Fetches and displays:
 *  - Attendee name
 *  - Ticket code formatted as XXXX-XXXX
 *  - QR code encoding the check-in URL (/c/<ticket_code>)
 *
 * Handles: invalid token (404), loading, network error.
 */

import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Layout } from "../components";
import { useTicket } from "../lib/queries";
import { Ticket, MessageSquare } from "lucide-react";

/** Format an 8-char code as XXXX-XXXX */
function formatTicketCode(raw: string): string {
  const cleaned = raw.replace(/-/g, "").toUpperCase();
  if (cleaned.length === 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return cleaned;
}

export function TicketPage() {
  const { token } = useParams<{ token: string }>();
  const { data: ticket, isLoading, error } = useTicket(token);

  const siteOrigin = import.meta.env.VITE_SITE_URL ?? window.location.origin;
  const checkinUrl = ticket ? `${siteOrigin}/c/${ticket.ticket_code}` : "";

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[80dvh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-ice border-t-transparent animate-spin" />
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Loading your ticket…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <Layout>
        <div className="min-h-[80dvh] flex items-center justify-center px-5">
          <div
            className="text-center max-w-sm flex flex-col items-center gap-5 rounded-2xl p-8"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <span className="text-5xl" aria-hidden="true"><Ticket size={48} /></span>
            <h1 className="font-serif text-2xl" style={{ color: "var(--color-ice)" }}>
              Ticket Not Found
            </h1>
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              This ticket link appears to be invalid or has been removed. Please
              check the SMS you received and try again.
            </p>
            <a
              href="/"
              className="font-sans text-sm font-semibold"
              style={{ color: "var(--color-ice)" }}
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  const formattedCode = formatTicketCode(ticket.ticket_code);

  return (
    <Layout>
      <style>{`
        @keyframes ticket-in {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="min-h-[85dvh] flex flex-col items-center justify-center px-5 py-16">
        {/* Heading */}
        <div className="text-center mb-8">
          <p
            className="font-sans text-xs tracking-[0.3em] uppercase mb-2"
            style={{ color: "var(--color-highlight)" }}
          >
            IYC Camp Meeting 2026
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl" style={{ color: "var(--color-ice)" }}>
            Your Ticket
          </h1>
        </div>

        {/* Ticket card */}
        <div
          className="w-full max-w-sm"
          style={{ animation: "ticket-in 0.6s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {/* Top section */}
          <div
            className="rounded-t-2xl p-7 flex flex-col items-center gap-5 text-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(103,163,177,0.3)",
              borderBottom: "none",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Cream glow blob behind QR */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(228,215,196,0.25) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* QR Code */}
            <div
              className="relative z-10 rounded-xl p-3"
              style={{ background: "white" }}
              aria-label={`QR code for check-in, encoding: ${checkinUrl}`}
            >
              <QRCodeSVG
                value={checkinUrl}
                size={180}
                level="M"
                includeMargin={false}
                fgColor="#1c6e86"
                bgColor="#ffffff"
              />
            </div>

            {/* Name */}
            <div>
              <p className="font-sans text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-highlight)" }}>
                Registered Attendee
              </p>
              <p className="font-serif text-2xl" style={{ color: "var(--color-ice)" }}>
                {[ticket.first_name, ticket.other_names, ticket.last_name].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>

          {/* Perforated divider */}
          <div
            className="flex items-center"
            aria-hidden="true"
            style={{ borderTop: "2px dashed rgba(103,163,177,0.3)" }}
          />

          {/* Bottom section — code */}
          <div
            className="rounded-b-2xl px-7 py-5 flex flex-col items-center gap-3 text-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(103,163,177,0.3)",
              borderTop: "none",
              backdropFilter: "blur(20px)",
            }}
          >
            <p className="font-sans text-xs uppercase tracking-widest" style={{ color: "var(--color-highlight)" }}>
              Ticket Code
            </p>
            <p
              id="ticket-code"
              className="font-serif tracking-[0.15em]"
              style={{
                fontSize: "2rem",
                color: "var(--color-ice)",
                textShadow: "0 0 30px rgba(216,245,249,0.4)",
              }}
            >
              {formattedCode}
            </p>
            <p className="font-sans text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              The Rain of His Spirit &bull; 23–26 Dec 2026
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div
          className="mt-6 max-w-sm text-center rounded-xl px-5 py-4 font-sans text-xs leading-relaxed"
          style={{
            background: "rgba(103,163,177,0.1)",
            border: "1px solid rgba(103,163,177,0.2)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Show this QR code or ticket code at the entrance on the day of the event. Screenshot
          it for offline access. Your ticket link was also sent via SMS.
        </div>

        {/* Testimony CTA */}
        <div className="mt-8">
          <Link
            to="/testimony"
            className="inline-flex items-center gap-2 rounded-full font-sans font-medium text-sm px-5 py-2.5 transition-all duration-200 hover:opacity-80"
            style={{
              border: "1px solid rgba(228,215,196,0.4)",
              color: "var(--color-highlight)",
              background: "rgba(228,215,196,0.06)",
            }}
          >
            <span aria-hidden="true"><MessageSquare size={16} /></span>
            Share your past IYC experience
          </Link>
        </div>
      </div>
    </Layout>
  );
}
