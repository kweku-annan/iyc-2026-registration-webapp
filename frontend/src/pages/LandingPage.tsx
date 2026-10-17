/**
 * Landing page — T14 full implementation.
 *
 * Sections (in order):
 *  1. Hero                 — HeroCarousel (Embla, 3 slides)
 *  2. About                — short paragraph
 *  3. Countdown            — live timer to 23 Dec 2026
 *  4. Programme            — tabbed schedule
 *  5. Venue                — map placeholder + travel notes
 *  6. Testimonials         — TestimonialsCarousel (Embla)
 *  7. Partners             — PartnersCarousel (Embla)
 *  8. FAQ                  — accessible accordion
 *  9. Contact              — WhatsApp / email / social
 * 10. Phase-2 placeholders — gallery, donate cards
 */

import { Link } from "react-router-dom";
import { HeartHandshake, ArrowRight } from "lucide-react";
import { Layout } from "../components";
import { useRegistrationStatus } from "../lib/queries";
import { HeroCarousel } from "../sections/HeroCarousel";
import { CountdownSection } from "../sections/CountdownSection";
import { ProgrammeSection } from "../sections/ProgrammeSection";
import { VenueSection } from "../sections/VenueSection";
import { TestimonialsCarousel } from "../sections/TestimonialsCarousel";
import { PartnersCarousel } from "../sections/PartnersCarousel";
import { FaqSection } from "../sections/FaqSection";
import { ContactSection } from "../sections/ContactSection";
import { GallerySection } from "../sections/GallerySection";

function DonateCard() {
  return (
    <div
      className="relative rounded-3xl p-6 sm:p-8 backdrop-blur-xl border transition-all duration-300 hover:border-ice/40 group overflow-hidden max-w-2xl mx-auto w-full text-left"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(28,110,134,0.18) 100%)",
        borderColor: "rgba(103,163,177,0.25)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
      }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute top-0 right-0 w-60 h-60 rounded-full filter blur-[70px] pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ background: "#FFCC00" }}
      />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner shrink-0"
              style={{
                background: "rgba(216,245,249,0.1)",
                borderColor: "rgba(103,163,177,0.3)",
                color: "var(--color-ice)",
              }}
            >
              <HeartHandshake size={24} />
            </div>
            <div>
              <span className="font-serif text-2xl text-ice font-semibold block leading-tight">
                Support IYC 2026
              </span>
              <span className="text-xs text-white/60 font-sans">
                Freewill Giving & In-Kind Sponsorship
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/30 border border-white/10 px-3 py-1.5 rounded-full text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#FFCC00" }}
            />
            <span className="text-white/80 font-medium">MTN MoMo Accepted</span>
          </div>
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-white/75 font-sans">
          IYC Conferences are sponsored by generous individuals and partner churches.
          We highly appreciate your donations in cash and kindness to keep the camp meeting
          completely free for every young person.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div className="font-mono text-xs sm:text-sm text-ice/90 flex items-center gap-2">
            <span className="text-white/50">MoMo:</span>
            <span className="font-bold text-white">053 052 4274</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span className="text-white/70 hidden sm:inline">Center for World Evangelism</span>
          </div>

          <Link
            to="/donate"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:scale-[1.03] group/btn cursor-pointer"
            style={{
              background: "var(--color-ice)",
              color: "var(--color-primary)",
              boxShadow: "0 0 20px rgba(216,245,249,0.3)",
            }}
          >
            <span>Donate via MoMo</span>
            <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { data: status } = useRegistrationStatus();
  const isOpen = status?.is_open ?? true;

  return (
    <Layout>
      {/* ══════════════════════════════════════
          1. HERO (carousel)
      ══════════════════════════════════════ */}
      <HeroCarousel isOpen={isOpen} />

      {/* ══════════════════════════════════════
          2. ABOUT
      ══════════════════════════════════════ */}
      <section
        id="about"
        className="py-24 px-5"
        style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
      >
        <div className="max-w-2xl mx-auto text-center flex flex-col gap-6">
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            About the Camp Meeting
          </h2>
          <p
            className="font-sans text-base sm:text-lg leading-relaxed"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            The International Youth For Christ Camp Meeting is an annual gathering of young
            believers coming together for worship, fellowship, and an encounter with the
            Holy Spirit. IYC-2026 promises four transformative days of inspiring messages,
            powerful praise, and community — all anchored in the theme{" "}
            <em style={{ color: "var(--color-ice)" }}>The Rain of His Spirit</em>.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. COUNTDOWN
      ══════════════════════════════════════ */}
      <CountdownSection />

      {/* ══════════════════════════════════════
          4. PROGRAMME
      ══════════════════════════════════════ */}
      <ProgrammeSection />

      {/* ══════════════════════════════════════
          5. VENUE
      ══════════════════════════════════════ */}
      <VenueSection />

      {/* ══════════════════════════════════════
          6. TESTIMONIALS (carousel)
      ══════════════════════════════════════ */}
      <TestimonialsCarousel />

      {/* ══════════════════════════════════════
          ENGAGE & SHARE
      ══════════════════════════════════════ */}
      <section className="py-16 px-5" style={{ background: "rgba(103,163,177,0.03)" }}>
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl mb-3" style={{ color: "var(--color-ice)" }}>
              Engage & Share
            </h2>
            <p className="font-sans text-sm sm:text-base max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
              Tell the world about IYC Camp Meeting 2026! Generate your personalized flyer or share your testimony of what God has done.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg">
            <a
              href="https://getdp.co/wD7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center rounded-full font-sans font-semibold px-6 py-3 transition-all duration-200 hover:scale-[1.03]"
              style={{
                background: "var(--color-ice)",
                color: "var(--color-primary)",
                boxShadow: "0 0 30px rgba(216,245,249,0.25)",
              }}
            >
              Personalized IYC Flyer
            </a>
            <Link
              to="/testimony"
              className="flex-1 inline-flex items-center justify-center rounded-full font-sans font-semibold px-6 py-3 transition-all duration-200 hover:scale-[1.03]"
              style={{
                border: "1px solid rgba(103,163,177,0.5)",
                color: "var(--color-ice)",
                background: "transparent",
              }}
            >
              Share Your Testimony
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          7. PARTNERS (carousel)
      ══════════════════════════════════════ */}
      <PartnersCarousel />

      {/* ══════════════════════════════════════
          8. FAQ
      ══════════════════════════════════════ */}
      <FaqSection />

      {/* ══════════════════════════════════════
          7. CONTACT
      ══════════════════════════════════════ */}
      <ContactSection />

      {/* ══════════════════════════════════════
          9. GALLERY
      ══════════════════════════════════════ */}
      <GallerySection />

      {/* ══════════════════════════════════════
          10. SUPPORT & GIVING
      ══════════════════════════════════════ */}
      <section
        id="donate"
        className="py-16 px-5"
        style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <DonateCard />

          {isOpen && (
            <div className="text-center pt-8 border-t border-white/10 w-full max-w-xl">
              <p className="font-sans text-xs uppercase tracking-widest text-ice/70 mb-2">
                Join us for 4 transformative days
              </p>
              <h3 className="font-serif text-2xl sm:text-3xl text-white mb-6">
                Ready for the Rain of His Spirit?
              </h3>
              <Link
                to="/register"
                id="bottom-register-btn"
                className="inline-flex items-center gap-2 rounded-full font-sans font-semibold text-sm sm:text-base px-8 py-3.5 transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: "var(--color-ice)",
                  color: "var(--color-primary)",
                  boxShadow: "0 0 25px rgba(216,245,249,0.25)",
                }}
              >
                Secure your spot — Register Free →
              </Link>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
