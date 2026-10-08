/**
 * Typed API query hooks for TanStack Query.
 * All calls go through lib/api.ts so the base URL stays in one place.
 */

import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";
import { api, HttpError } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegistrationStatus {
  is_open: boolean;
}

export interface OtpVerifyResponse {
  token: string;
}

export interface RegistrationResult {
  detail: string;
  already_registered: boolean;
}

export interface TicketData {
  first_name: string;
  last_name: string;
  other_names: string | null;
  date_of_birth: string;
  age: number;
  profession: string;
  student_status: boolean;
  school_name: string | null;
  location: string;
  accommodation_preference: string;
  invitation_by_someone: boolean;
  invitation_by_who: string | null;
  church: string;
  attended_before: boolean;
  ticket_code: string;
  ticket_token: string;
}

export interface RegistrationPayload {
  first_name: string;
  last_name: string;
  other_names: string | null;
  date_of_birth: string;
  profession: string;
  student_status: boolean;
  school_name: string | null;
  location: string;
  accommodation_preference: string;
  invitation_by_someone: boolean;
  invitation_by_who: string | null;
  phone: string;
  church: string;
  attended_before: boolean;
  otp_token: string;
  website: ""; // honeypot — always empty
}

export interface OtpSendResponse {
    detail: string;
    already_registered: boolean;
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useRegistrationStatus() {
  return useQuery<RegistrationStatus, HttpError>({
    queryKey: ["registration-status"],
    queryFn: () => api.get<RegistrationStatus>("/registrations/status"),
    staleTime: 30_000, // re-check every 30 s
    retry: 2,
  });
}

export function useTicket(token: string | undefined) {
  return useQuery<TicketData, HttpError>({
    queryKey: ["ticket", token],
    queryFn: () => api.get<TicketData>(`/tickets/${token}`),
    enabled: Boolean(token),
    staleTime: Infinity, // ticket data doesn't change
    retry: 1,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

// export function useSendOtp(
//   options?: UseMutationOptions<{ detail: string }, HttpError, { phone: string }>,
// ) {
//   return useMutation({
//     mutationFn: (payload: { phone: string }) =>
//       api.post<{ detail: string }>("/registrations/otp/send", payload),
//     ...options,
//   });
// }

export function useSendOtp(
    options?: UseMutationOptions<OtpSendResponse, HttpError, { phone: string }>,
) {
  return useMutation({
    mutationFn: (payload: { phone: string }) =>
      api.post<OtpSendResponse>("/registrations/otp/send", payload),
    ...options,
  });
}

export function useVerifyOtp(
  options?: UseMutationOptions<OtpVerifyResponse, HttpError, { phone: string; code: string }>,
) {
  return useMutation({
    mutationFn: (payload: { phone: string; code: string }) =>
      api.post<OtpVerifyResponse>("/registrations/otp/verify", payload),
    ...options,
  });
}

export function useCreateRegistration(
  options?: UseMutationOptions<RegistrationResult, HttpError, RegistrationPayload>,
) {
  return useMutation({
    mutationFn: (payload: RegistrationPayload) =>
      api.post<RegistrationResult>("/registrations", payload),
    ...options,
  });
}

// ── Admin queries ──────────────────────────────────────────────────────────────

export interface AdminStats {
  total_registered: number;
  checked_in: number;
  walk_ins: number;
  pending_testimonials: number;
}

export interface AdminRegistration {
  id: number;
  first_name: string;
  last_name: string;
  other_names: string | null;
  date_of_birth: string;
  age: number;
  profession: string;
  student_status: boolean;
  school_name: string | null;
  invitation_by_someone: boolean;
  invitation_by_who: string | null;
  phone_e164: string;
  church: string;
  attended_before: boolean;
  ticket_code: string;
  source: string;
  phone_verified_at: string | null;
  registered_at: string;
  checked_in_at: string | null;
}

export interface PaginatedRegistrations {
  items: AdminRegistration[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  csrf_token: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function useAdminStats() {
  return useQuery<AdminStats, HttpError>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
    refetchInterval: 30_000,
  });
}

export function useAdminRegistrations(search: string, skip: number, limit: number) {
  return useQuery<PaginatedRegistrations, HttpError>({
    queryKey: ["admin", "registrations", search, skip, limit],
    queryFn: () =>
      api.get<PaginatedRegistrations>("/admin/registrations", { search, skip, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminLogin(
  options?: UseMutationOptions<AdminUser, HttpError, LoginPayload>,
) {
  return useMutation({
    mutationFn: (payload: LoginPayload) => api.post<AdminUser>("/auth/login", payload),
    ...options,
  });
}

export function useAdminLogout(
  csrfToken: string,
  options?: UseMutationOptions<unknown, HttpError, void>,
) {
  return useMutation({
    mutationFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
      }),
    ...options,
  });
}

export function usePatchSettings(csrfToken: string) {
  return useMutation({
    mutationFn: (payload: { registration_open?: boolean; registration_closes_at?: string }) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useAnonymize(csrfToken: string) {
  return useMutation({
    mutationFn: (id: number) =>
      fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/registrations/${id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        },
      ).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

// ── Testimonials ─────────────────────────────────────────────────────────────

export interface TestimonialPublic {
  id: number;
  body: string;
  computed_name: string;
}

export interface TestimonialPayload {
  body: string;
  privacy_mode: "public" | "anonymous_name_private" | "anonymous_no_name";
  display_name?: string;
  private_name?: string;
  consent: boolean;
}

export interface TestimonialAdmin {
  id: number;
  body: string;
  privacy_mode: string;
  display_name: string | null;
  private_name: string | null;
  alias_name: string | null;
  registration_id: number | null;
  consent: boolean;
  status: "pending" | "approved" | "rejected";
  featured: boolean;
  created_at: string;
}

export function useSubmitTestimony() {
  return useMutation({
    mutationFn: (payload: TestimonialPayload) => api.post("/testimonials", payload),
  });
}

export function useTestimonialsFeatured() {
  return useQuery<TestimonialPublic[], Error>({
    queryKey: ["testimonials", "featured"],
    queryFn: () => api.get("/testimonials/featured"),
  });
}

export function useAdminTestimonials() {
  return useQuery<TestimonialAdmin[], Error>({
    queryKey: ["admin", "testimonials"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/testimonials`, {
        credentials: "include",
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useUpdateTestimonial(csrfToken: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status?: string; featured?: boolean } }) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/testimonials/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

// ── Partners ───────────────────────────────────────────────────────────────────

export interface Partner {
  id: number;
  name: string;
  logo_url: string;
  website_url: string | null;
  location: string | null;
  sort_order: number;
  is_active: boolean;
}

export type PartnerCreate = Omit<Partner, "id">;
export type PartnerUpdate = Partial<PartnerCreate>;

export function usePartners() {
  return useQuery<Partner[], Error>({
    queryKey: ["partners"],
    queryFn: () => api.get("/partners"),
  });
}

export function useAdminPartners() {
  return useQuery<Partner[], Error>({
    queryKey: ["admin", "partners"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/partners`, {
        credentials: "include",
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useCreatePartner(csrfToken: string) {
  return useMutation({
    mutationFn: (payload: PartnerCreate) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/partners`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useUpdatePartner(csrfToken: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PartnerUpdate }) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/partners/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useDeletePartner(csrfToken: string) {
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/partners/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

// ── Donations ────────────────────────────────────────────────────────────────

export interface DonationInitialize {
  amount_minor: number;
  is_anonymous: boolean;
  donor_name?: string | null;
  donor_email?: string | null;
}

export interface DonationInitializeResponse {
  authorization_url: string;
}

export interface DonationAdmin {
  id: number;
  reference: string;
  amount_minor: number;
  currency: string;
  status: string;
  is_anonymous: boolean;
  donor_name: string | null;
  donor_email: string | null;
  created_at: string;
  paid_at: string | null;
}

export function useInitializeDonation() {
  return useMutation({
    mutationFn: (payload: DonationInitialize) => api.post<DonationInitializeResponse>("/donations/initialize", payload),
  });
}

export function useAdminDonations(csrfToken: string | null) {
  return useQuery<DonationAdmin[], Error>({
    queryKey: ["admin-donations"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/donations`, {
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken ?? "" },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
    enabled: !!csrfToken,
  });
}

// ── Users (Organizers & Volunteers) ──────────────────────────────────────────

export interface UserAdmin {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export function useAdminUsers(csrfToken: string | null) {
  return useQuery<UserAdmin[], Error>({
    queryKey: ["admin-users"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/users`, {
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken ?? "" },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
    enabled: !!csrfToken,
  });
}

export function useCreateUser(csrfToken: string) {
  return useMutation({
    mutationFn: (payload: any) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useUpdateUser(csrfToken: string) {
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useDeleteUser(csrfToken: string) {
  return useMutation({
    mutationFn: (id: number) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

// ── Check-in System ─────────────────────────────────────────────────────────

export interface CheckinLookupResult {
  id: number;
  first_name: string;
  last_name: string;
  other_names: string | null;
  date_of_birth: string;
  age: number;
  profession: string;
  student_status: boolean;
  school_name: string | null;
  invitation_by_someone: boolean;
  invitation_by_who: string | null;
  phone_e164: string;
  church: string;
  ticket_code: string;
  registered_at: string;
  checked_in_at: string | null;
  source: string;
}

export function useCheckinLookup(csrfToken: string | null, code: string) {
  return useQuery<CheckinLookupResult, Error>({
    queryKey: ["checkin-lookup", code],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/checkin/lookup/${code}`, {
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken ?? "" },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
    enabled: !!csrfToken && !!code,
  });
}

export function useCheckinSearch(csrfToken: string | null, query: string) {
  return useQuery<CheckinLookupResult[], Error>({
    queryKey: ["checkin-search", query],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/checkin/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken ?? "" },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
    enabled: !!csrfToken && query.length >= 3,
  });
}

export function useCheckinConfirm(csrfToken: string) {
  return useMutation({
    mutationFn: (code: string) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/checkin/confirm/${code}`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}

export function useWalkInRegistration(csrfToken: string) {
  return useMutation({
    mutationFn: (payload: any) =>
      fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/checkin/walk-in`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new HttpError(res.status, body);
        }
        return res.json();
      }),
  });
}
