import { createBrowserRouter, Outlet, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./lib/adminAuth";

// ── Page imports (placeholder components until T10/T11 build them out) ──────
import { LandingPage } from "./pages/LandingPage";
import { GalleryPage } from "./pages/GalleryPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RegisterSuccessPage } from "./pages/RegisterSuccessPage";
import { TicketPage } from "./pages/TicketPage";
import { TestimonyPage } from "./pages/TestimonyPage";
import { DonatePage } from "./pages/DonatePage";
import { DonateThanksPage } from "./pages/DonateThanksPage";
import { CheckinRedirectPage } from "./pages/CheckinRedirectPage";
import { CheckinPage } from "./pages/CheckinPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminStatsPage } from "./pages/admin/AdminStatsPage";
import { AdminRegistrationsPage } from "./pages/admin/AdminRegistrationsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminTestimonialsPage } from "./pages/admin/AdminTestimonialsPage";
import { AdminPartnersPage } from "./pages/admin/AdminPartnersPage";
import { AdminDonationsPage } from "./pages/admin/AdminDonationsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";

/**
 * All routes from spec section 9.
 *
 * Public:         /  /register  /register/success  /ticket/:token
 *                 /testimony  /donate  /donate/thanks
 * Staff (hidden): /c/:code  /check-in  /admin/*
 *
 * Admin pages carry noindex meta (enforced in each component).
 */
export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/gallery",
    element: <GalleryPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/register/success",
    element: <RegisterSuccessPage />,
  },
  {
    path: "/ticket/:token",
    element: <TicketPage />,
  },
  {
    path: "/testimony",
    element: <TestimonyPage />,
  },
  {
    path: "/donate",
    element: <DonatePage />,
  },
  {
    path: "/donate/thanks",
    element: <DonateThanksPage />,
  },

  // ── Staff routes (never linked from public pages) ──────────────────────────
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    path: "/c/:code",
    element: (
      <AdminAuthProvider>
        <CheckinRedirectPage />
      </AdminAuthProvider>
    ),
  },
  {
    path: "/check-in",
    element: (
      <AdminAuthProvider>
        <CheckinPage />
      </AdminAuthProvider>
    ),
  },
  {
    path: "/admin",
    element: <AdminDashboard />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <AdminStatsPage />,
      },
      {
        path: "registrations",
        element: <AdminRegistrationsPage />,
      },
      {
        path: "testimonials",
        element: <AdminTestimonialsPage />,
      },
      {
        path: "partners",
        element: <AdminPartnersPage />,
      },
      {
        path: "donations",
        element: <AdminDonationsPage />,
      },
      {
        path: "users",
        element: <AdminUsersPage />,
      },
      {
        path: "settings",
        element: <AdminSettingsPage />,
      },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────────
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

// Re-export Outlet so layout shells can use it without importing react-router directly
export { Outlet };
