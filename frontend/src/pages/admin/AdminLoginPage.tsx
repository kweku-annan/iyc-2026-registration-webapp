/**
 * Admin Login page — /admin/login
 *
 * Never linked from the public site.
 * On success, refreshes auth context and navigates to /admin/dashboard.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Input } from "../../components";
import { useAdminLogin } from "../../lib/queries";
import { HttpError } from "../../lib/api";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const DARK = "#0a1a20";
const CARD_BG = "rgba(255,255,255,0.05)";
const BORDER = "rgba(103,163,177,0.25)";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAdminLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // If already authenticated, go straight to dashboard
  useEffect(() => {
    // Quiet check — errors just mean we stay on the login page
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/auth/me`, {
      credentials: "include",
    }).then((r) => {
      if (r.ok) navigate("/admin/dashboard", { replace: true });
    }).catch(() => undefined);
  }, [navigate]);

  async function onSubmit(data: LoginForm) {
    try {
      await login.mutateAsync(data);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err instanceof HttpError
          ? err.body.detail
          : "An unexpected error occurred. Please try again.";
      setError("root", { message: msg });
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: DARK,
        padding: "1.5rem",
      }}
    >
      {/* noindex — staff page */}
      <meta name="robots" content="noindex, nofollow" />

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--color-ice)",
              color: "var(--color-primary)",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: "0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            IYC
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.75rem",
              color: "var(--color-ice)",
              marginBottom: "0.25rem",
            }}
          >
            Staff Login
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Organizers and volunteers only.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: "1.25rem",
            padding: "2rem",
            backdropFilter: "blur(20px)",
          }}
        >
          <form
            id="admin-login-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <FormField
              label="Email address"
              htmlFor="admin-email"
              error={errors.email?.message}
              required
            >
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="organizer@iyc.org"
                error={!!errors.email}
                {...register("email")}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="admin-password"
              error={errors.password?.message}
              required
            >
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={!!errors.password}
                {...register("password")}
              />
            </FormField>

            {errors.root && (
              <div
                role="alert"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem 1rem",
                  color: "#fca5a5",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {errors.root.message}
              </div>
            )}

            <Button
              id="admin-login-btn"
              type="submit"
              loading={isSubmitting || login.isPending}
              fullWidth
              size="lg"
            >
              Sign In
            </Button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "var(--font-sans)",
          }}
        >
          IYC Camp Meeting 2026 · Admin Panel
        </p>
      </div>
    </div>
  );
}
