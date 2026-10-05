/**
 * Registration flow — 3 steps:
 *  1. Phone    — phone input with country selector (defaults to GH)
 *  2. OTP      — 6-digit code verification
 *  3. Details  — attendee profile and church details
 *
 * On success, redirects to /ticket/:token
 *
 * Handles: registration closed, duplicate, rate-limited, offline, server errors.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Layout, Button, Input, FormField, useToast } from "../components";
import {
  useRegistrationStatus,
  useSendOtp,
  useVerifyOtp,
  useCreateRegistration,
} from "../lib/queries";
import { HttpError } from "../lib/api";

// ── Step indicator ──────────────────────────────────────────────────────────

type Step = "phone" | "otp" | "details";

const STEPS: { id: Step; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "otp", label: "Verify" },
  { id: "details", label: "Details" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8" role="list">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.id} className="flex items-center" role="listitem">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all duration-300"
                style={{
                  background: done
                    ? "var(--color-highlight)"
                    : active
                      ? "var(--color-ice)"
                      : "rgba(255,255,255,0.1)",
                  color: done || active ? "var(--color-primary)" : "rgba(255,255,255,0.4)",
                  boxShadow: active ? "0 0 20px rgba(216,245,249,0.4)" : "none",
                }}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className="text-[10px] font-sans hidden sm:block"
                style={{ color: active ? "var(--color-ice)" : "rgba(255,255,255,0.4)" }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-12 sm:w-16 h-px mx-1 transition-all duration-500"
                style={{
                  background: done ? "var(--color-highlight)" : "rgba(255,255,255,0.1)",
                }}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
          <span className="text-5xl" aria-hidden="true">🌧️</span>
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

// ── Zod schemas ─────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  first_name: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(150, "First name is too long"),
  last_name: z.string().min(2, "Last name must be at least 2 characters").max(150),
  other_names: z.string().max(150).optional(),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  profession: z.string().min(2, "Profession must be at least 2 characters").max(150),
  student_status: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  school_name: z.string().max(150).optional(),
  invitation_by_someone: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  invitation_by_who: z.string().max(150).optional(),
  church: z
    .string()
    .min(2, "Church name must be at least 2 characters")
    .max(150, "Church name is too long"),
  attended_before: z.enum(["yes", "no"], {
    required_error: "Please select an option",
  }),
});

type DetailsForm = z.infer<typeof detailsSchema>;

// ── Main component ──────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { push: notify } = useToast();
  const { data: status, isLoading: statusLoading } = useRegistrationStatus();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [otpToken, setOtpToken] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const createReg = useCreateRegistration();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  });

  // Start/reset resend cooldown
  function startCooldown(seconds = 60) {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  // async function handleSendOtp(isResend = false) {
  //   setPhoneError("");
  //   if (!phone || !isValidPhoneNumber(phone)) {
  //     setPhoneError("Please enter a valid phone number.");
  //     return;
  //   }
  //
  //   try {
  //     await sendOtp.mutateAsync({ phone });
  //     startCooldown();
  //     if (!isResend) {
  //       setStep("otp");
  //     } else {
  //       notify("A new code has been sent to your phone.", "success");
  //     }
  //   } catch (err) {
  //     setPhoneError(extractError(err));
  //   }
  // }

  async function handleSendOtp(isResend = false) {
    setPhoneError("");

    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }

    try {
      const result = await sendOtp.mutateAsync({ phone });

      // Existing users do not reeceive an OTP and do not continue to the OTP step.
      if (result.already_registered) {
        notify(result.detail, "info", 8000);
        return;
      }

      startCooldown();
      if (!isResend) {
        setStep("otp");
      } else {
        notify("A new code has been sent to your phone.", "success");
      }
    } catch (err) {
        setPhoneError(extractError(err));
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    setOtpError("");
    if (otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }

    try {
      const result = await verifyOtp.mutateAsync({ phone, code: otpCode });
      setOtpToken(result.token);
      setStep("details");
    } catch (err) {
      setOtpError(extractError(err));
    }
  }

  // ── Step 3: Submit details ────────────────────────────────────────────────
  async function handleSubmitDetails(data: DetailsForm) {
    setSubmitError("");
    try {
      const result = await createReg.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        other_names: data.other_names || null,
        date_of_birth: data.date_of_birth,
        profession: data.profession,
        student_status: data.student_status === "yes",
        school_name: data.school_name || null,
        invitation_by_someone: data.invitation_by_someone === "yes",
        invitation_by_who: data.invitation_by_who || null,
        phone,
        church: data.church,
        attended_before: data.attended_before === "yes",
        otp_token: otpToken,
        website: "",
      });

      if (result.ticket_token) {
        navigate(`/ticket/${result.ticket_token}`);
      } else {
        // Duplicate: resent ticket link via SMS
        notify(result.detail, "info", 8000);
        navigate("/");
      }
    } catch (err) {
      setSubmitError(extractError(err));
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

        <StepIndicator current={step} />

        {/* ── STEP 1: Phone ── */}
        {step === "phone" && (
          <Card>
            <div>
              <h2 className="font-serif text-2xl mb-1" style={{ color: "var(--color-ice)" }}>
                Enter your phone number
              </h2>
              <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                We'll send a verification code to this number.
              </p>
            </div>

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
                  onChange={(v) => setPhone(v ?? "")}
                  placeholder="024 000 0000"
                  aria-label="Phone number"
                />
              </div>
            </FormField>

            <Button
              id="send-otp-btn"
              onClick={() => handleSendOtp(false)}
              loading={sendOtp.isPending}
              fullWidth
            >
              Send Verification Code
            </Button>
          </Card>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === "otp" && (
          <Card>
            <div>
              <h2 className="font-serif text-2xl mb-1" style={{ color: "var(--color-ice)" }}>
                Enter the code
              </h2>
              <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                A 6-digit code was sent to{" "}
                <strong style={{ color: "var(--color-ice)" }}>{phone}</strong>.
                It expires in 10 minutes.
              </p>
            </div>

            <FormField label="Verification Code" htmlFor="otp-input" required error={otpError}>
              <Input
                id="otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                error={!!otpError}
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
              />
            </FormField>

            <Button
              id="verify-otp-btn"
              onClick={handleVerifyOtp}
              loading={verifyOtp.isPending}
              fullWidth
            >
              Verify Code
            </Button>

            <div className="flex flex-col items-center gap-2 text-sm font-sans">
              <span style={{ color: "rgba(255,255,255,0.5)" }}>Didn't receive it?</span>
              <button
                id="resend-otp-btn"
                onClick={() => handleSendOtp(true)}
                disabled={resendCooldown > 0 || sendOtp.isPending}
                className="font-semibold transition-opacity disabled:opacity-40"
                style={{ color: "var(--color-ice)" }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
              <button
                onClick={() => { setStep("phone"); setOtpCode(""); setOtpError(""); }}
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Change phone number
              </button>
            </div>
          </Card>
        )}

        {/* ── STEP 3: Details ── */}
        {step === "details" && (
          <Card>
            <div>
              <h2 className="font-serif text-2xl mb-1" style={{ color: "var(--color-ice)" }}>
                Your details
              </h2>
              <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                Almost done! Just a few more details.
              </p>
            </div>

            <form
              id="details-form"
              onSubmit={handleSubmit(handleSubmitDetails)}
              className="flex flex-col gap-5"
              noValidate
            >
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

              <FormField label="Date of Birth" htmlFor="date-of-birth" required error={errors.date_of_birth?.message}>
                <Input id="date-of-birth" type="date" error={!!errors.date_of_birth} {...register("date_of_birth")} />
              </FormField>

              <FormField label="Profession" htmlFor="profession" required error={errors.profession?.message}>
                <Input id="profession" type="text" placeholder="e.g. Teacher" error={!!errors.profession} {...register("profession")} />
              </FormField>

              <FormField label="Are you a student?" htmlFor="student-status-yes" required error={errors.student_status?.message}>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => (
                    <label key={val} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium" style={{ border: "1px solid rgba(103,163,177,0.4)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" }}>
                      <input type="radio" id={`student-status-${val}`} value={val} className="sr-only" {...register("student_status")} />
                      {val === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="School Name" htmlFor="school-name" error={errors.school_name?.message}>
                <Input id="school-name" type="text" placeholder="Optional" error={!!errors.school_name} {...register("school_name")} />
              </FormField>

              <FormField label="Were you invited by someone?" htmlFor="invitation-yes" required error={errors.invitation_by_someone?.message}>
                <div className="flex gap-3">
                  {(["yes", "no"] as const).map((val) => (
                    <label key={val} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium" style={{ border: "1px solid rgba(103,163,177,0.4)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" }}>
                      <input type="radio" id={`invitation-${val}`} value={val} className="sr-only" {...register("invitation_by_someone")} />
                      {val === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
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
                  {(["yes", "no"] as const).map((val) => (
                    <label
                      key={val}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 cursor-pointer font-sans text-sm font-medium transition-all duration-200"
                      style={{
                        border: "1px solid rgba(103,163,177,0.4)",
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      <input
                        type="radio"
                        id={`attended-before-${val}`}
                        value={val}
                        className="sr-only"
                        {...register("attended_before")}
                      />
                      {val === "yes" ? "✅ Yes" : "🙋 No, first time"}
                    </label>
                  ))}
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
