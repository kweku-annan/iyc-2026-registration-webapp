/**
 * Toast / notification system.
 *
 * Consists of:
 *   - useToast()   — hook to push/dismiss toasts from anywhere
 *   - ToastProvider — renders the portal; wrap the app root with it
 *   - toast         — singleton helper: toast.success(), toast.error(), toast.info()
 *
 * Toasts auto-dismiss after 4 seconds unless `duration` is set.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, X, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const ICONS: Record<ToastVariant, React.ReactNode> = {
    success: <Check size={14} />,
    error: <X size={14} />,
    info: <Info size={14} />,
  };

  const COLORS: Record<ToastVariant, string> = {
    success: "border-green-400/60 bg-green-500/15 text-green-200",
    error: "border-red-400/60 bg-red-500/15 text-red-200",
    info: "border-ice/40 bg-ice/10 text-ice",
  };

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}

      {/* Toast portal — fixed top-right */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border",
              "backdrop-blur-md shadow-lg font-sans text-sm",
              "animate-in slide-in-from-right-4 fade-in duration-300",
              COLORS[t.variant],
            ].join(" ")}
          >
            <span
              className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold border border-current"
              aria-hidden="true"
            >
              {ICONS[t.variant]}
            </span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

// ── Singleton helper (for use outside components) ──────────────────────────────

let _push: ToastContextValue["push"] | null = null;

/** Call this inside ToastProvider to wire up the singleton. */
export function _wireToast(fn: ToastContextValue["push"]) {
  _push = fn;
}

export const toast = {
  success: (msg: string, duration?: number) => _push?.(msg, "success", duration),
  error: (msg: string, duration?: number) => _push?.(msg, "error", duration),
  info: (msg: string, duration?: number) => _push?.(msg, "info", duration),
};
