/**
 * Registration flow — 2 steps:
 *  1. Details  — phone, optional email, and attendee profile fields
 *  2. Done     — success or already-registered confirmation
 *
 * OTP infrastructure (useSendOtp / useVerifyOtp hooks) is intentionally NOT connected
 * to this flow. The backend endpoints still exist and can be re-enabled in the future.
 *
 * Handles: registration closed, duplicate phone, rate-limited, offline, server errors.
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Layout, Button, Input, FormField, Turnstile, type TurnstileHandle } from "../components";
import {
  useRegistrationStatus,
  useCreateRegistration,
} from "../lib/queries";
import { HttpError } from "../lib/api";
import { Check, CloudRain, CheckCircle, User as UserIcon } from "lucide-react";

// ── Glassmorphic card wrapper ───────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl p-7 sm:p-8 flex flex-col gap-6"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(103,163,177,0.25)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </div>
  );
}

// ── Error banner ────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 text-sm font-sans leading-snug"
      style={{
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.4)",
        color: "#fca5a5",
      }}
    >
      {message}
    </div>
  );
}

// ── Helper: extract human-readable error message ───────────────────────────

function extractError(err: unknown): string {
  if (err instanceof HttpError) return err.body.detail ?? "An error occurred.";
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

// ── Registration closed view ────────────────────────────────────────────────

function RegistrationClosed() {
  return (
    <Layout>
      <div className="min-h-[80dvh] flex items-center justify-center px-5">
        <div className="text-center max-w-md flex flex-col items-center gap-5">
          <span className="text-5xl" aria-hidden="true"><CloudRain size={48} /></span>
          <h1 className="font-serif text-3xl" style={{ color: "var(--color-ice)" }}>
            Registration is Closed
          </h1>
          <p className="font-sans text-base" style={{ color: "rgba(255,255,255,0.7)" }}>
            Registration for IYC-2026 has closed. We hope to see you at the camp meeting!
          </p>
          <Button variant="secondary" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </div>
      </div>
    </Layout>
  );
}

// ── Zod schema ──────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  first_name: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(150, "First name is too long"),
  last_name: z.string().min(2, "Last name must be at least 2 characters").max(150),
  other_names: z.string().max(150).optional(),
  // Date of birth split into three fields: day and month are required, year is optional
  dob_day: z
    .string()
    .min(1, "Day is required")
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 31;
    }, "Day must be between 1 and 31"),
  dob_month: z
    .string()
    .min(1, "Month is required")
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 12;
    }, "Month must be between 1 and 12"),
  dob_year: z
    .string()
    .optional()
    .refine((v) => {
      if (!v || v.trim() === "") return true;
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1900 && n <= new Date().getFullYear();
    }, "Please enter a valid year"),
  profession: z.string().min(2, "Profession must be at least 2 characters").max(150),
  student_status: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  school_name: z.string().max(150).optional(),
  location: z.string().min(2, "Location is required").max(150),
  accommodation_preference: z.enum(["camp_site", "hotel", "hostel"], {
    required_error: "Please select an accommodation preference",
  }),
  invitation_by_someone: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  invitation_by_who: z.string().max(150).optional(),
  church: z
    .string()
    .min(2, "Church name must be at least 2 characters")
    .max(150, "Church name is too long"),
  attended_before: z.enum(["yes", "no"], {
    required_error: "Please select an option",
  }),
  // Email is optional — valid email format if provided, or blank
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
});

type DetailsForm = z.infer<typeof detailsSchema>;

// ── Main component ──────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { data: status, isLoading: statusLoading } = useRegistrationStatus();

  // Phone is controlled outside React Hook Form so the PhoneInput component
  // can update it freely. It's validated manually on submit.
  const [phone, setPhone] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");

  const [isExistingRegistration, setIsExistingRegistration] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [isDone, setIsDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const createReg = useCreateRegistration();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  const studentStatus = watch("student_status");
  const invitationBySomeone = watch("invitation_by_someone");
  const attendedBefore = watch("attended_before");
  const accommodationPreference = watch("accommodation_preference");

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmitDetails(data: DetailsForm) {
    setSubmitError("");
    setPhoneError("");

    // Validate phone number before submitting
    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }

    const hasTurnstileKey = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
    if (hasTurnstileKey && turnstileToken === null) {
      setSubmitError("Please complete the security check before submitting.");
      return;
    }

    try {
      // Assemble date_of_birth: if year is provided use YYYY-MM-DD, else MM-DD (partial)
      const day = data.dob_day.padStart(2, "0");
      const month = data.dob_month.padStart(2, "0");
      const dateOfBirth = data.dob_year && data.dob_year.trim() !== ""
        ? `${data.dob_year}-${month}-${day}`
        : `${month}-${day}`;

      const result = await createReg.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        other_names: data.other_names || null,
        date_of_birth: dateOfBirth,
        profession: data.profession,
        student_status: data.student_status === "yes",
        school_name: data.school_name || null,
        location: data.location,
        accommodation_preference: data.accommodation_preference,
        invitation_by_someone: data.invitation_by_someone === "yes",
        invitation_by_who: data.invitation_by_who || null,
        phone,
        email: data.email || null,
        church: data.church,
        attended_before: data.attended_before === "yes",
        website: "",
        turnstile_token: turnstileToken,
      });

      setIsExistingRegistration(result.already_registered);
      setIsDone(true);
    } catch (err) {
      setSubmitError(extractError(err));
      // Reset single-use Turnstile token and widget on error so user can retry
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (statusLoading) {
    return (
      <Layout>
        <div className="min-h-[80dvh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-ice border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!status?.is_open) return <RegistrationClosed />;

  return (
    <Layout>
      <style>{`
        /* Override react-phone-number-input for our brand */
        .PhoneInputInput {
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 1rem;
          font-family: var(--font-sans);
          width: 100%;
          padding: 0;
        }
        .PhoneInputInput::placeholder { color: rgba(255,255,255,0.4); }
        .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          color: white;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .PhoneInputCountryIconImg { border-radius: 2px; }
      `}</style>

      <div className="min-h-[90dvh] flex flex-col items-center justify-center px-5 py-16">
        {/* Page heading */}
        <div className="text-center mb-8 max-w-sm">
          <p
            className="font-sans text-xs tracking-[0.3em] uppercase mb-3"
            style={{ color: "var(--color-highlight)" }}
          >
            IYC Camp Meeting 2026
          </p>
          <h1
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", color: "var(--color-ice)" }}
          >
            Register Free
          </h1>
        </div>

        {/* ── DONE Card ── */}
        {isDone && (
          <Card>
            <div className="text-center flex flex-col items-center gap-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{
                  background: "rgba(216,245,249,0.15)",
                  border: "1px solid rgba(216,245,249,0.35)",
                  color: "var(--color-ice)",
                  boxShadow: "0 0 30px rgba(216,245,249,0.15)",
                }}
                aria-hidden="true"
              >
                <Check size={32} />
              </div>

              <div className="flex flex-col gap-4">
                <h2
                  className="font-serif text-2xl sm:text-3xl"
                  style={{ color: "var(--color-ice)" }}
                >
                  {isExistingRegistration
                    ? "You are already registered"
                    : "Registration Complete"}
                </h2>
                <p
                  className="font-sans text-sm sm:text-base leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  {isExistingRegistration
                    ? "Your registration has already been completed. Your ticket number and ticket link have been sent to your phone by SMS."
                    : "Thank you for registering for IYC Camp Meeting 2026! Your ticket number and ticket link have been sent to your phone by SMS."}
                </p>
                {!isExistingRegistration && (
                  <p
                    className="font-sans text-sm sm:text-base leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.72)" }}
                  >
                    Over the course of the weeks ahead, you will receive SMS messages from the
                    organizers about activities and important information leading up to
                    the program.
                  </p>
                )}
                <p
                  className="font-sans text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Please check your messages. If you did not receive the SMS,
                  please contact the organizers for assistance.
                </p>
              </div>

              {!isExistingRegistration && (
                <div className="w-full flex flex-col gap-3">
                  <a
                    href="https://getdp.co/wD7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full font-sans font-semibold px-6 py-3 transition-all duration-200"
                    style={{
                      background: "var(--color-ice)",
                      color: "var(--color-primary)",
                      boxShadow: "0 0 30px rgba(216,245,249,0.25)",
                    }}
                  >
                    Create Your Personalized IYC Flyer
                  </a>

                  <a
                    href="/testimony"
                    className="inline-flex items-center justify-center rounded-full font-sans font-semibold px-6 py-3 transition-all duration-200"
                    style={{
                      border: "1px solid rgba(103,163,177,0.5)",
                      color: "var(--color-ice)",
                      background: "transparent",
                    }}
                  >
                    Share Your Testimony
                  </a>
                </div>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate("/")}
              >
                Go to Home
              </Button>
            </div>
          </Card>
        )}

        {/* ── Details Form ── */}
        {!isDone && (
          <Card>
            <div>
              <h2 className="font-serif text-2xl mb-1" style={{ color: "var(--color-ice)" }}>
                Your details
              </h2>
              <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                Fill in your details below to complete your registration.
              </p>
            </div>

            <form
              id="details-form"
              onSubmit={handleSubmit(handleSubmitDetails)}
              className="flex flex-col gap-5"
              noValidate
            >
              {/* ── Contact Info ── */}
              <FormField label="Phone Number" htmlFor="phone-input" required error={phoneError}>
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: `1px solid ${phoneError ? "rgba(239,68,68,0.6)" : "rgba(103,163,177,0.4)"}`,
                  }}
                >
                  <PhoneInput
                    id="phone-input"
                    international
                    defaultCountry="GH"
                    value={phone}
                    onChange={(v) => {
                      setPhone(v ?? "");
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="024 000 0000"
                    aria-label="Phone number"
                  />
                </div>
              </FormField>

              <FormField
                label="Email Address"
                htmlFor="email"
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="Optional — e.g. kofi@example.com"
                  autoComplete="email"
                  error={!!errors.email}
                  {...register("email")}
                />
              </FormField>

              {/* ── Personal Info ── */}
              <FormField label="First Name" htmlFor="first-name" required error={errors.first_name?.message}>
                <Input
                  id="first-name"
                  type="text"
                  placeholder="e.g. Kofi"
                  autoComplete="given-name"
                  error={!!errors.first_name}
                  {...register("first_name")}
                />
              </FormField>

              <FormField label="Last Name" htmlFor="last-name" required error={errors.last_name?.message}>
                <Input id="last-name" type="text" placeholder="e.g. Mensah" autoComplete="family-name" error={!!errors.last_name} {...register("last_name")} />
              </FormField>

              <FormField label="Other Names" htmlFor="other-names" error={errors.other_names?.message}>
                <Input id="other-names" type="text" placeholder="Optional" error={!!errors.other_names} {...register("other_names")} />
              </FormField>

              <FormField label="Date of Birth" htmlFor="dob-day" required error={errors.dob_day?.message || errors.dob_month?.message || errors.dob_year?.message}>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Day and month are required. Year is optional.
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="dob-day"
                      type="number"
                      placeholder="Day"
                      min={1}
                      max={31}
                      error={!!errors.dob_day}
                      {...register("dob_day")}
                    />
                    <span className="block text-xs mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Day *</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="dob-month"
                      type="number"
                      placeholder="Month"
                      min={1}
                      max={12}
                      error={!!errors.dob_month}
                      {...register("dob_month")}
                    />
                    <span className="block text-xs mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Month *</span>
                  </div>
                  <div className="flex-[1.5]">
                    <Input
                      id="dob-year"
                      type="number"
                      placeholder="Year (optional)"
                      min={1900}
                      max={new Date().getFullYear()}
                      error={!!errors.dob_year}
                      {...register("dob_year")}
                    />
                    <span className="block text-xs mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Year</span>
                  </div>
                </div>
              </FormField>

              <FormField label="Profession" htmlFor="profession" required error={errors.profession?.message}>
                <Input id="profession" type="text" placeholder="e.g. Teacher" error={!!errors.profession} {...register("profession")} />
              </FormField>

              <FormField label="Location / City" htmlFor="location" required error={errors.location?.message}>
                <Input id="location" type="text" placeholder="e.g. Accra" error={!!errors.location} {...register("location")} />
              </FormField>

              <FormField label="Accommodation Preference" htmlFor="accommodation_preference" required error={errors.accommodation_preference?.message}>
                <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Limited Accommodation is provided at the camp site. For hotel or hostel reservation, you will be contacted by the Organizers.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(["camp_site", "hotel", "hostel"] as const).map((val) => {
                    const isSelected = accommodationPreference === val;
                    const displayLabel = val === "camp_site" ? "Camp Site" : val === "hotel" ? "Hotel" : "Hostel";
                    return (
                      <label key={val} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium transition-all duration-200 text-center" style={{
                        border: isSelected ? "1px solid var(--color-ice)" : "1px solid rgba(103,163,177,0.4)",
                        background: isSelected ? "var(--color-ice)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "var(--color-primary)" : "rgba(255,255,255,0.8)"
                      }}>
                        <input type="radio" id={`accommodation-${val}`} value={val} className="sr-only" {...register("accommodation_preference")} />
                        {displayLabel}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="Are you a student?" htmlFor="student-status-yes" required error={errors.student_status?.message}>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => {
                    const isSelected = studentStatus === val;
                    return (
                      <label key={val} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium transition-all duration-200" style={{
                        border: isSelected ? "1px solid var(--color-ice)" : "1px solid rgba(103,163,177,0.4)",
                        background: isSelected ? "var(--color-ice)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "var(--color-primary)" : "rgba(255,255,255,0.8)"
                      }}>
                        <input type="radio" id={`student-status-${val}`} value={val} className="sr-only" {...register("student_status")} />
                        {val === "yes" ? "Yes" : "No"}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="School Name" htmlFor="school-name" error={errors.school_name?.message}>
                <Input id="school-name" type="text" placeholder="Optional" error={!!errors.school_name} {...register("school_name")} />
              </FormField>

              <FormField label="Were you invited by someone?" htmlFor="invitation-yes" required error={errors.invitation_by_someone?.message}>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => {
                    const isSelected = invitationBySomeone === val;
                    return (
                      <label key={val} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium transition-all duration-200" style={{
                        border: isSelected ? "1px solid var(--color-ice)" : "1px solid rgba(103,163,177,0.4)",
                        background: isSelected ? "var(--color-ice)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "var(--color-primary)" : "rgba(255,255,255,0.8)"
                      }}>
                        <input type="radio" id={`invitation-${val}`} value={val} className="sr-only" {...register("invitation_by_someone")} />
                        {val === "yes" ? "Yes" : "No"}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="Invited By (Name)" htmlFor="invitation-by-who" error={errors.invitation_by_who?.message}>
                <Input id="invitation-by-who" type="text" placeholder="Optional" error={!!errors.invitation_by_who} {...register("invitation_by_who")} />
              </FormField>

              <FormField
                label="Church / Home Assembly"
                htmlFor="church"
                required
                error={errors.church?.message}
              >
                <Input
                  id="church"
                  type="text"
                  placeholder="e.g. Grace Community Church"
                  error={!!errors.church}
                  {...register("church")}
                />
              </FormField>

              <FormField
                label="Have you attended IYC before?"
                htmlFor="attended-before-yes"
                required
                error={errors.attended_before?.message}
              >
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => {
                    const isSelected = attendedBefore === val;
                    return (
                      <label
                        key={val}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium transition-all duration-200"
                        style={{
                          border: isSelected ? "1px solid var(--color-ice)" : "1px solid rgba(103,163,177,0.4)",
                          background: isSelected ? "var(--color-ice)" : "rgba(255,255,255,0.05)",
                          color: isSelected ? "var(--color-primary)" : "rgba(255,255,255,0.8)",
                        }}
                      >
                        <input
                          type="radio"
                          id={`attended-before-${val}`}
                          value={val}
                          className="sr-only"
                          {...register("attended_before")}
                        />
                        {val === "yes" ? (
                          <span className="flex items-center gap-1.5"><CheckCircle size={16} /> Yes</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><UserIcon size={16} /> No, first time</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              {/* Honeypot — hidden from real users */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              />

              {/* Anti-bot security check (active if site key is configured) */}
              <Turnstile
                ref={turnstileRef}
                action="registration"
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setSubmitError("");
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                  turnstileRef.current?.reset();
                }}
                onError={() => {
                  setTurnstileToken(null);
                  turnstileRef.current?.reset();
                }}
              />

              {submitError && <ErrorBanner message={submitError} />}

              <Button
                id="submit-registration-btn"
                type="submit"
                loading={createReg.isPending}
                fullWidth
                size="lg"
              >
                Complete Registration
              </Button>
            </form>
          </Card>
        )}
      </div>
    </Layout>
  );
}
