import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Layout, Button, FormField } from "../components";
import { useSubmitTestimony } from "../lib/queries";
import { HttpError } from "../lib/api";

const testimonySchema = z.object({
  body: z.string().min(10, "Please share a bit more detail.").max(20000, "Testimony is too long."),
  privacy_mode: z.enum(["public", "anonymous_name_private", "anonymous_no_name"]),
  display_name: z.string().optional(),
  private_name: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the privacy policy to submit." }),
  }),
}).refine(
  (data) => {
    if (data.privacy_mode === "public" && !data.display_name?.trim()) return false;
    return true;
  },
  { message: "Display name is required for public testimonies.", path: ["display_name"] }
).refine(
  (data) => {
    if (data.privacy_mode === "anonymous_name_private" && !data.private_name?.trim()) return false;
    return true;
  },
  { message: "Private name is required for this privacy mode.", path: ["private_name"] }
);

type TestimonyFormValues = z.infer<typeof testimonySchema>;

export function TestimonyPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const submitMutation = useSubmitTestimony();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TestimonyFormValues>({
    resolver: zodResolver(testimonySchema),
    defaultValues: {
      privacy_mode: "public",
      body: "",
      display_name: "",
      private_name: "",
    },
  });

  const privacyMode = watch("privacy_mode");

  const onSubmit = async (data: TestimonyFormValues) => {
    try {
      await submitMutation.mutateAsync(data);
      setIsSuccess(true);
    } catch (err) {
      // Error is handled implicitly or can be shown in a toast.
      // Assuming a global error handler or we could set local error state.
    }
  };

  return (
    <Layout>
      <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-sans text-sm mb-8 transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            ← Back to home
          </Link>

          <h1
            className={`font-serif text-4xl sm:text-5xl mb-4 ${isSuccess ? "text-center" : ""}`}
            style={{ color: "var(--color-ice)" }}
          >
            Glory Hallelujah!
          </h1>
          {!isSuccess && (
            <p
              className="font-sans text-sm mb-10 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              We would love to hear how God moved in your life at IYC camp meetings. Your testimony encourages others.
            </p>
          )}

          {isSuccess ? (
            <div
              className="p-8 rounded-2xl text-center mt-6"
              style={{
                background: "rgba(103,163,177,0.08)",
                border: "1px solid rgba(103,163,177,0.2)",
              }}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "rgba(103,163,177,0.15)", color: "var(--color-ice)" }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl mb-2" style={{ color: "var(--color-ice)" }}>
                Thank you!
              </h2>
              <p className="font-sans text-sm mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                Your testimony has been submitted. It will be reviewed before appearing on the public gallery.
              </p>
              <Link to="/">
                <Button variant="secondary">Return to Homepage</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                label="Your Testimony"
                error={errors.body?.message}
              >
                <p className="font-sans text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Share what God has done for you.
                </p>
                <textarea
                  {...register("body")}
                  rows={6}
                  className="w-full bg-transparent font-sans text-base px-4 py-3 rounded-xl resize-y"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    outline: "none",
                  }}
                  placeholder="I attended the camp meeting and..."
                />
              </FormField>

              <div className="space-y-3">
                <p className="font-sans text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Privacy Preference
                </p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="public"
                      {...register("privacy_mode")}
                      className="mt-1 cursor-pointer"
                    />
                    <div>
                      <span className="font-sans text-sm block text-white">Public (Use my name)</span>
                      <span className="font-sans text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Your testimony will be displayed with the name you provide below.
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="anonymous_name_private"
                      {...register("privacy_mode")}
                      className="mt-1 cursor-pointer"
                    />
                    <div>
                      <span className="font-sans text-sm block text-white">Anonymous (Keep my name private)</span>
                      <span className="font-sans text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Provide your real name for our records only. It will appear publicly as a random alias (e.g. "David (Anonymous)").
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value="anonymous_no_name"
                      {...register("privacy_mode")}
                      className="mt-1 cursor-pointer"
                    />
                    <div>
                      <span className="font-sans text-sm block text-white">Completely Anonymous</span>
                      <span className="font-sans text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Do not collect my name at all. It will appear publicly as a random alias.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {privacyMode === "public" && (
                <FormField label="Display Name" error={errors.display_name?.message}>
                  <input
                    {...register("display_name")}
                    type="text"
                    className="w-full bg-transparent font-sans text-base px-4 py-3 rounded-xl"
                    style={{ border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none" }}
                    placeholder="e.g. John Doe"
                  />
                </FormField>
              )}

              {privacyMode === "anonymous_name_private" && (
                <FormField label="Real Name (Kept Private)" error={errors.private_name?.message}>
                  <input
                    {...register("private_name")}
                    type="text"
                    className="w-full bg-transparent font-sans text-base px-4 py-3 rounded-xl"
                    style={{ border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none" }}
                    placeholder="e.g. Jane Doe"
                  />
                </FormField>
              )}

              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  {...register("consent")}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="consent" className="font-sans text-xs cursor-pointer select-none leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  I consent to sharing this testimony. I understand that if it is approved, it may be featured on the public website according to my privacy preference.
                </label>
              </div>
              {errors.consent && (
                <p className="font-sans text-xs text-red-400 mt-1">{errors.consent.message}</p>
              )}

              {submitMutation.error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 font-sans text-sm text-red-400">
                  {submitMutation.error instanceof HttpError
                    ? submitMutation.error.body?.detail || submitMutation.error.message
                    : "Failed to submit testimony. Please try again later."}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-4 text-base mt-4"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Testimony"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
