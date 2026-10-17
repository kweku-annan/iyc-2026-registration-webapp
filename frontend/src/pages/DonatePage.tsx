import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Copy,
  Check,
  Phone,
  Building2,
  Smartphone,
  HeartHandshake,
  ShieldCheck,
  ArrowLeft,
  Utensils,
  PackageCheck,
  Bus,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Layout } from "../components";
import { PartnersCarousel } from "../sections/PartnersCarousel";

const MOMO_NUMBER_RAW = "+233246570376";
const MOMO_NUMBER_DISPLAY = "+233 24 657 0376";
const MOMO_NUMBER_LOCAL = "024 657 0376";
const MOMO_ACCOUNT_NAME = "Center for World Evangelism";
const MOMO_REFERENCE = "IYC 2026";
const WHATSAPP_LINK =
  "https://wa.me/233246570376?text=Hello%20IYC%20Secretariat%2C%20I%20would%20like%20to%20support%20IYC%202026%20with%20a%20donation%20in%20cash%20or%20kindness.";

export function DonatePage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <Layout>
      <div className="relative min-h-screen flex flex-col font-sans text-white overflow-hidden bg-deep">
        {/* Ambient atmospheric glows */}
        <div
          className="absolute top-24 left-1/4 w-96 h-96 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none opacity-40 animate-pulse"
          style={{ background: "rgba(103,163,177,0.3)" }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full mix-blend-screen filter blur-[150px] pointer-events-none opacity-30 animate-pulse"
          style={{ background: "rgba(28,110,134,0.35)", animationDelay: "2s" }}
        />

        <main className="relative flex-1 px-4 sm:px-6 pt-12 pb-20 z-10 max-w-5xl mx-auto w-full">
          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-sans text-sm mb-8 transition-opacity hover:opacity-100 text-white/60 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          {/* Hero & narrative */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-5"
              style={{
                background: "rgba(216,245,249,0.1)",
                color: "var(--color-ice)",
                border: "1px solid rgba(103,163,177,0.3)",
              }}
            >
              <Sparkles size={14} className="text-ice" />
              Sow into the Next Generation
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-ice mb-6 leading-tight">
              Support IYC 2026
            </h1>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed font-sans max-w-2xl mx-auto">
              IYC Conferences are sponsored by individuals and partner churches.
              We highly appreciate your donations in cash and kindness. Your freewill
              giving helps us keep the entire camp meeting free for every youth,
              covering feeding, lodging, learning resources, and life-changing ministry.
            </p>
          </div>

          {/* Core Giving Card: MTN Mobile Money */}
          <div className="max-w-2xl mx-auto mb-16">
            <div
              className="relative rounded-3xl p-6 sm:p-10 backdrop-blur-xl border shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(28,110,134,0.18) 100%)",
                borderColor: "rgba(103,163,177,0.35)",
              }}
            >
              {/* Subtle card highlight glow */}
              <div
                className="absolute top-0 right-0 w-72 h-72 rounded-full filter blur-[80px] pointer-events-none opacity-25"
                style={{ background: "#FFCC00" }}
              />

              {/* Card Header with MTN MoMo Badge */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-black shadow-lg"
                    style={{ background: "#FFCC00" }}
                  >
                    <Smartphone size={24} className="text-neutral-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-white tracking-wide">
                        MTN Mobile Money
                      </span>
                      <span
                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full text-neutral-900"
                        style={{ background: "#FFCC00" }}
                      >
                        MoMo
                      </span>
                    </div>
                    <span className="text-xs text-white/60">
                      Official Giving Account • Direct & Instant
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-ice/90 bg-white/5 border border-ice/20 px-3 py-1.5 rounded-full">
                  <ShieldCheck size={14} className="text-ice" />
                  Verified Merchant
                </div>
              </div>

              {/* Account Details Blocks */}
              <div className="space-y-4">
                {/* Account Name */}
                <div className="bg-black/25 border border-white/10 rounded-2xl p-4 sm:p-5 transition-all hover:border-ice/40">
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-ice" />
                      ACCOUNT NAME
                    </span>
                    <span className="text-ice text-[11px] font-medium">Verify on prompt</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg sm:text-xl font-semibold text-white tracking-tight break-words">
                      {MOMO_ACCOUNT_NAME}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(MOMO_ACCOUNT_NAME, "name")}
                      aria-label="Copy Account Name"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        background: copiedKey === "name" ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
                        color: copiedKey === "name" ? "#86efac" : "var(--color-ice)",
                        border: "1px solid",
                        borderColor: copiedKey === "name" ? "rgba(74,222,128,0.4)" : "rgba(103,163,177,0.3)",
                      }}
                    >
                      {copiedKey === "name" ? (
                        <>
                          <Check size={14} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile Money Number */}
                <div className="bg-black/25 border border-white/10 rounded-2xl p-4 sm:p-5 transition-all hover:border-ice/40">
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} className="text-ice" />
                      MOMO NUMBER
                    </span>
                    <span className="text-white/50 text-[11px]">MTN Ghana</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xl sm:text-2xl font-mono font-bold text-ice tracking-wider">
                        {MOMO_NUMBER_DISPLAY}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        Local format: <span className="font-mono text-white/80">{MOMO_NUMBER_LOCAL}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(MOMO_NUMBER_RAW, "phone")}
                        aria-label="Copy Mobile Money Number"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm"
                        style={{
                          background: copiedKey === "phone" ? "rgba(74,222,128,0.2)" : "rgba(216,245,249,0.15)",
                          color: copiedKey === "phone" ? "#86efac" : "var(--color-ice)",
                          border: "1px solid",
                          borderColor: copiedKey === "phone" ? "rgba(74,222,128,0.4)" : "rgba(216,245,249,0.35)",
                        }}
                      >
                        {copiedKey === "phone" ? (
                          <>
                            <Check size={14} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Number</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Suggested Reference */}
                <div className="bg-black/25 border border-white/10 rounded-2xl p-4 sm:p-5 transition-all hover:border-ice/40">
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                    <span>SUGGESTED REFERENCE</span>
                    <span className="text-[11px] text-white/50">Optional</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-medium text-base text-white/90">
                      {MOMO_REFERENCE}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(MOMO_REFERENCE, "ref")}
                      aria-label="Copy Suggested Reference"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        background: copiedKey === "ref" ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
                        color: copiedKey === "ref" ? "#86efac" : "var(--color-ice)",
                        border: "1px solid",
                        borderColor: copiedKey === "ref" ? "rgba(74,222,128,0.4)" : "rgba(103,163,177,0.3)",
                      }}
                    >
                      {copiedKey === "ref" ? (
                        <>
                          <Check size={12} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick actions for mobile visitors */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <a
                  href={`tel:*170%23`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
                  style={{
                    background: "#FFCC00",
                    color: "#0a1a20",
                  }}
                >
                  <Smartphone size={16} />
                  Dial *170# (MTN MoMo)
                </a>
                <a
                  href={`tel:${MOMO_NUMBER_RAW}`}
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-semibold text-sm transition-all duration-200 hover:bg-white/10 cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(103,163,177,0.3)",
                    color: "var(--color-ice)",
                  }}
                >
                  <Phone size={16} />
                  Call MoMo Line
                </a>
              </div>

              {/* Simple privacy reassurance */}
              <p className="text-center text-xs text-white/50 mt-6 leading-relaxed">
                Direct peer-to-merchant payment. No online forms or personal records saved on this website.
                Cross-network transfers from Telecel Cash, AT Money, and GhanaPay bank apps are also supported.
              </p>
            </div>
          </div>

          {/* How to Send: Step-by-Step Guide */}
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-serif text-ice text-center mb-8">
              How to Send via MTN MoMo
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <div
                className="p-6 rounded-2xl border transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(103,163,177,0.18)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4 font-mono"
                  style={{ background: "rgba(216,245,249,0.15)", color: "var(--color-ice)" }}
                >
                  1
                </div>
                <h3 className="font-semibold text-white mb-2 text-base font-sans">
                  Dial *170#
                </h3>
                <p className="text-xs text-white/65 leading-relaxed">
                  Dial <span className="font-mono text-ice font-semibold">*170#</span> on your MTN phone, select <strong className="text-white">Transfer Money (1)</strong>, and choose <strong className="text-white">MoMo User (1)</strong>.
                </p>
              </div>

              <div
                className="p-6 rounded-2xl border transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(103,163,177,0.18)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4 font-mono"
                  style={{ background: "rgba(216,245,249,0.15)", color: "var(--color-ice)" }}
                >
                  2
                </div>
                <h3 className="font-semibold text-white mb-2 text-base font-sans">
                  Enter Number & Check
                </h3>
                <p className="text-xs text-white/65 leading-relaxed">
                  Enter <span className="font-mono text-ice font-semibold">0246570376</span>. Confirm the recipient name displays as <strong className="text-white">Center for World Evangelism</strong>.
                </p>
              </div>

              <div
                className="p-6 rounded-2xl border transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(103,163,177,0.18)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4 font-mono"
                  style={{ background: "rgba(216,245,249,0.15)", color: "var(--color-ice)" }}
                >
                  3
                </div>
                <h3 className="font-semibold text-white mb-2 text-base font-sans">
                  Authorize Transfer
                </h3>
                <p className="text-xs text-white/65 leading-relaxed">
                  Enter your amount, use <span className="font-mono text-ice font-semibold">IYC 2026</span> as reference, and enter your MoMo PIN to complete the blessing.
                </p>
              </div>
            </div>
          </div>

          {/* Donations in Cash and Kindness Section */}
          <div
            className="max-w-3xl mx-auto rounded-3xl p-8 sm:p-10 mb-20 border backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(103,163,177,0.22)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ice mb-2">
                  <HeartHandshake size={16} />
                  Partnership in Action
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif text-white">
                  Giving in Cash and Kindness
                </h2>
              </div>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-[1.03] shrink-0"
                style={{
                  background: "rgba(74,222,128,0.15)",
                  color: "#86efac",
                  border: "1px solid rgba(74,222,128,0.4)",
                }}
              >
                <MessageCircle size={15} />
                Speak with Secretariat
              </a>
            </div>

            <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-8">
              Beyond financial contributions, the camp meeting thrives on the practical
              kindness and tangible support of individuals and churches. If you would
              like to donate supplies, equipment, or services, we receive them with joy and gratitude.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="p-2.5 rounded-lg bg-ice/10 text-ice shrink-0">
                  <Utensils size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1 font-sans">
                    Foodstuffs & Provisions
                  </h4>
                  <p className="text-xs text-white/60">
                    Bags of rice, cooking oil, canned goods, fresh produce, and clean bottled water for delegates.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="p-2.5 rounded-lg bg-ice/10 text-ice shrink-0">
                  <PackageCheck size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1 font-sans">
                    Welfare & Bedding Supplies
                  </h4>
                  <p className="text-xs text-white/60">
                    Student mattresses, bedsheets, blankets, toiletries, and first-aid / medical items.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="p-2.5 rounded-lg bg-ice/10 text-ice shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1 font-sans">
                    Equipment & Production
                  </h4>
                  <p className="text-xs text-white/60">
                    Sound, musical gear, screens/projectors, lighting, generators, and conference printing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="p-2.5 rounded-lg bg-ice/10 text-ice shrink-0">
                  <Bus size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1 font-sans">
                    Transport & Logistics
                  </h4>
                  <p className="text-xs text-white/60">
                    Subsidizing bus transport for rural and campus delegations, fuel, and local coordination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Partner Churches Carousel (As requested) */}
        <PartnersCarousel />

        {/* Closing scripture / blessing footer note */}
        <section className="py-12 px-6 text-center border-t border-white/10 bg-black/20">
          <div className="max-w-2xl mx-auto">
            <blockquote className="font-serif italic text-lg sm:text-xl text-ice/90 mb-3">
              &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
            </blockquote>
            <cite className="font-sans text-xs uppercase tracking-widest text-white/50 not-italic">
              2 Corinthians 9:7
            </cite>
          </div>
        </section>
      </div>
    </Layout>
  );
}
