/**
 * Admin Registrations page — /admin/registrations
 *
 * Features:
 *  - Search bar (debounced 300ms)
 *  - Paginated table (50 per page)
 *  - Export CSV button (browser download)
 *  - Anonymize action per row (confirm dialog)
 */

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../../lib/adminAuth";
import {
  useAdminRegistrations,
  useAnonymize,
  type AdminRegistration,
} from "../../lib/queries";
import { Button, useToast } from "../../components";
import { HttpError } from "../../lib/api";

const LIMIT = 50;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCode(raw: string): string {
  const c = raw.replace(/-/g, "").toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        style={{
          background: "#0d2129",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: "1.25rem",
          padding: "2rem",
          maxWidth: 380,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <h2
            id="confirm-title"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.25rem",
              color: "var(--color-ice)",
              marginBottom: "0.5rem",
            }}
          >
            Anonymize Registration?
          </h2>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            This will permanently erase the personal data for{" "}
            <strong style={{ color: "white" }}>{name}</strong>. This action cannot
            be undone.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="secondary" onClick={onCancel} size="sm" fullWidth>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} size="sm" fullWidth>
            Anonymize
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminRegistrationsPage() {
  const { csrfToken } = useAdminAuth();
  const { push: notify } = useToast();
  const qc = useQueryClient();
  const anonymize = useAnonymize(csrfToken);

  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [confirmReg, setConfirmReg] = useState<AdminRegistration | null>(null);

  // Debounce search 300 ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(rawSearch);
      setSkip(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawSearch]);

  const { data, isLoading, isFetching } = useAdminRegistrations(search, skip, LIMIT);
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const currentPage = Math.floor(skip / LIMIT) + 1;

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function handleExport() {
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/registrations/export.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "iyc-2026-registrations.csv";
    // Include credentials by redirecting — the browser sends session cookies automatically
    a.target = "_blank";
    a.click();
  }

  // ── Anonymize ───────────────────────────────────────────────────────────────
  async function handleAnonymize() {
    if (!confirmReg) return;
    try {
      await anonymize.mutateAsync(confirmReg.id);
      await qc.invalidateQueries({ queryKey: ["admin", "registrations"] });
      await qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      notify(`${confirmReg.full_name}'s data has been anonymized.`, "success");
    } catch (err) {
      const msg = err instanceof HttpError ? err.body.detail : "Failed to anonymize.";
      notify(msg, "error");
    } finally {
      setConfirmReg(null);
    }
  }

  // ── Table cell styles ───────────────────────────────────────────────────────
  const TD: React.CSSProperties = {
    padding: "0.75rem 0.875rem",
    fontFamily: "var(--font-sans)",
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(103,163,177,0.1)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };
  const TH: React.CSSProperties = {
    ...TD,
    color: "rgba(255,255,255,0.45)",
    fontWeight: 600,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(103,163,177,0.2)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.75rem",
              color: "var(--color-ice)",
              marginBottom: "0.25rem",
            }}
          >
            Registrants
          </h1>
          {data && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              {data.total.toLocaleString()} total
              {isFetching && " · refreshing…"}
            </p>
          )}
        </div>

        <Button
          id="export-csv-btn"
          variant="secondary"
          size="sm"
          onClick={handleExport}
        >
          📥 Export CSV
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          id="registrations-search"
          type="search"
          placeholder="Search by name, phone, or ticket code…"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          aria-label="Search registrants"
          style={{
            width: "100%",
            maxWidth: 440,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(103,163,177,0.3)",
            borderRadius: "0.75rem",
            padding: "0.625rem 1rem",
            color: "white",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            minHeight: 44,
          }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(103,163,177,0.15)",
          borderRadius: "1rem",
          overflowX: "auto",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-sans)" }}>
            Loading…
          </div>
        ) : !data?.items.length ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-sans)" }}>
            {search ? "No results match your search." : "No registrations yet."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                {["Name", "Phone", "Church", "Code", "Source", "Registered", "Checked In", ""].map((h) => (
                  <th key={h} scope="col" style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((reg) => (
                <tr
                  key={reg.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(216,245,249,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ ...TD, color: "white", fontWeight: 500 }}>{reg.full_name}</td>
                  <td style={TD}>{reg.phone_e164}</td>
                  <td style={{ ...TD, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {reg.church}
                  </td>
                  <td style={{ ...TD, fontFamily: "monospace", letterSpacing: "0.1em", color: "var(--color-ice)" }}>
                    {formatCode(reg.ticket_code)}
                  </td>
                  <td style={TD}>
                    <span
                      style={{
                        padding: "0.15em 0.6em",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background: reg.source === "walk_in" ? "rgba(251,191,36,0.15)" : "rgba(103,163,177,0.15)",
                        color: reg.source === "walk_in" ? "#fbbf24" : "var(--color-highlight)",
                        border: `1px solid ${reg.source === "walk_in" ? "rgba(251,191,36,0.3)" : "rgba(103,163,177,0.3)"}`,
                        textTransform: "capitalize",
                      }}
                    >
                      {reg.source === "walk_in" ? "Walk-in" : "Online"}
                    </span>
                  </td>
                  <td style={TD}>{formatDate(reg.registered_at)}</td>
                  <td style={TD}>
                    {reg.checked_in_at ? (
                      <span style={{ color: "#86efac" }}>✓ {formatDate(reg.checked_in_at)}</span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...TD, textAlign: "right" }}>
                    {!reg.full_name.startsWith("Anonymized") && (
                      <button
                        id={`anonymize-btn-${reg.id}`}
                        onClick={() => setConfirmReg(reg)}
                        aria-label={`Anonymize ${reg.full_name}`}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "0.5rem",
                          color: "#fca5a5",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.7rem",
                          padding: "0.35rem 0.6rem",
                          cursor: "pointer",
                          minHeight: 32,
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        🗑 Anonymize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginTop: "1rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
          }}
        >
          <Button
            id="prev-page-btn"
            variant="secondary"
            size="sm"
            disabled={skip === 0}
            onClick={() => setSkip((s) => Math.max(0, s - LIMIT))}
          >
            ← Prev
          </Button>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            id="next-page-btn"
            variant="secondary"
            size="sm"
            disabled={skip + LIMIT >= (data?.total ?? 0)}
            onClick={() => setSkip((s) => s + LIMIT)}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmReg && (
        <ConfirmDialog
          name={confirmReg.full_name}
          onConfirm={handleAnonymize}
          onCancel={() => setConfirmReg(null)}
          loading={anonymize.isPending}
        />
      )}
    </div>
  );
}
