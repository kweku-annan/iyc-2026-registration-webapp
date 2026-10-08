/**
 * RegisterSuccessPage — shown after a successful registration.
 *
 * In practice the RegisterPage navigates directly to /ticket/:token,
 * but this page handles the /register/success route as a fallback
 * (e.g. direct URL access) and redirects home.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components";
import { PartyPopper } from "lucide-react";

export function RegisterSuccessPage() {
  const navigate = useNavigate();

  // If someone lands here directly (no token), redirect home after 3 s
  useEffect(() => {
    const t = setTimeout(() => navigate("/", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-[80dvh] flex items-center justify-center px-5">
        <div className="text-center max-w-sm flex flex-col items-center gap-5">
          <span className="text-5xl" aria-hidden="true"><PartyPopper size={48} /></span>
          <h1 className="font-serif text-3xl" style={{ color: "var(--color-ice)" }}>
            You're Registered!
          </h1>
          <p className="font-sans text-base" style={{ color: "rgba(255,255,255,0.7)" }}>
            Your ticket has been sent via SMS. Redirecting you home…
          </p>
          <div className="w-6 h-6 rounded-full border-2 border-ice border-t-transparent animate-spin" />
        </div>
      </div>
    </Layout>
  );
}
