/**
 * Admin authentication context.
 *
 * - AdminAuthProvider: fetches /auth/me on mount; shows loader;
 *   redirects to /admin/login on 401.
 * - useAdminAuth(): returns { user, csrfToken, logout }
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { api, HttpError } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  csrf_token: string | null;
}

interface AdminAuthContextValue {
  user: AdminUser;
  csrfToken: string;
  logout: () => Promise<void>;
  /** Call after login to refresh auth state without a full page reload */
  refresh: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

type Status = "loading" | "authenticated" | "unauthenticated";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<AdminUser>("/auth/me");
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      setStatus("unauthenticated");
      if (err instanceof HttpError && err.status === 401) {
        navigate("/admin/login", { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1a20",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid var(--color-ice)",
            borderTopColor: "transparent",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) return null;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        csrfToken: user.csrf_token ?? "",
        logout,
        refresh: fetchMe,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}
