/**
 * Admin Settings page — /admin/settings
 *
 * Controls:
 *  - Toggle registration open / closed (large, accessible)
 *  - Date-time picker for registration closes_at
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../../lib/adminAuth";
import { useRegistrationStatus, usePatchSettings } from "../../lib/queries";
import { Button, useToast } from "../../components";
import { HttpError } from "../../lib/api";
import { Check, X } from "lucide-react";

export function AdminSettingsPage() {
  const { csrfToken } = useAdminAuth();
  const { push: notify } = useToast();
  const qc = useQueryClient();
  const patchSettings = usePatchSettings(csrfToken);

  // Re-use the public status endpoint to get current open state
  const { data: status, isLoading } = useRegistrationStatus();

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [closesAt, setClosesAt] = useState<string>("");

  useEffect(() => {
    if (status !== undefined) {
      setIsOpen(status.is_open);
    }
  }, [status]);

  async function handleSave() {
    try {
      await patchSettings.mutateAsync({
        registration_open: isOpen,
        registration_closes_at: closesAt || undefined,
      });
      // Invalidate cached status so the public page reflects the change
      await qc.invalidateQueries({ queryKey: ["registration-status"] });
      notify("Settings saved successfully.", "success");
    } catch (err) {
      const msg =
        err instanceof HttpError ? err.body.detail : "Failed to save settings.";
      notify(msg, "error");
    }
  }

  const TOGGLE_SIZE = 56; // large touch target

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.75rem",
            color: "var(--color-ice)",
            marginBottom: "0.25rem",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Control registration availability.
        </p>
      </div>

      <div
        style={{
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Registration open/close card */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${isOpen ? "rgba(134,239,172,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "1.25rem",
            padding: "1.5rem",
            transition: "border-color 0.3s",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "white",
                  marginBottom: "0.25rem",
                }}
              >
                Registration Status
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: isOpen ? "#86efac" : "#fca5a5",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isOpen ? "#86efac" : "#f87171",
                  }}
                />
                {isLoading ? "Loading…" : isOpen ? "Open — accepting registrations" : "Closed — not accepting registrations"}
              </div>
            </div>

            {/* Toggle */}
            <button
              id="registration-toggle-btn"
              role="switch"
              aria-checked={isOpen}
              aria-label={`Registration is ${isOpen ? "open" : "closed"} — click to ${isOpen ? "close" : "open"}`}
              onClick={() => setIsOpen((v) => !v)}
              style={{
                width: TOGGLE_SIZE * 1.8,
                height: TOGGLE_SIZE,
                borderRadius: TOGGLE_SIZE,
                background: isOpen ? "#86efac" : "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.3s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  left: isOpen ? `calc(100% - ${TOGGLE_SIZE - 6}px)` : 6,
                  width: TOGGLE_SIZE - 12,
                  height: TOGGLE_SIZE - 12,
                  borderRadius: "50%",
                  background: isOpen ? "var(--color-primary)" : "rgba(255,255,255,0.4)",
                  transition: "left 0.25s, background 0.25s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
                aria-hidden="true"
              >
                {isOpen ? <Check size={20} color="var(--color-ice)" /> : <X size={20} color="rgba(255,255,255,0.7)" />}
              </span>
            </button>
          </div>
        </div>

        {/* Closes at card */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(103,163,177,0.2)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
          }}
        >
          <label
            htmlFor="closes-at-input"
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: "0.875rem",
              color: "var(--color-ice)",
              marginBottom: "0.75rem",
            }}
          >
            Registration closes at
          </label>
          <input
            id="closes-at-input"
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(103,163,177,0.4)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              color: "white",
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              colorScheme: "dark",
              minHeight: 48,
            }}
          />
          <p
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Leave blank to keep the existing close time unchanged.
          </p>
        </div>

        <Button
          id="save-settings-btn"
          onClick={handleSave}
          loading={patchSettings.isPending}
          size="lg"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
