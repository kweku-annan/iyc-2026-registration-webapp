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




// ── Phase-2 placeholder card ──────────────────────────────────────────────────

function PlaceholderCard({
  // icon,
  title,
  description,
}: {
  // icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(103,163,177,0.2)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="text-3xl" aria-hidden="true"></span>
      <h3 className="font-serif text-xl" style={{ color: "var(--color-ice)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
        {description}
      </p>
      <span
        className="text-xs font-sans font-medium px-3 py-1 rounded-full self-start"
        style={{
          background: "rgba(103,163,177,0.2)",
          color: "var(--color-highlight)",
          border: "1px solid rgba(103,163,177,0.3)",
        }}
      >
        Coming Soon
      </span>
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
          10. PHASE-2 PLACEHOLDERS (testimonials, donations)
      ══════════════════════════════════════ */}
      <section
        id="coming-soon"
        className="py-16 px-5 pb-24"
        style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <div className="text-center">
            <h2 className="font-serif text-3xl sm:text-4xl mb-3" style={{ color: "var(--color-ice)" }}>
              More to Come
            </h2>
            <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              These sections are being prepared and will be live soon.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <PlaceholderCard
              // icon="💬"
              title="Testimonials"
              description="Stories of lives changed at previous camp meetings."
            />
            <PlaceholderCard
              // icon="💝"
              title="Donate"
              description="Support the camp meeting ministry with a donation."
            />
          </div>

          {isOpen && (
            <div className="text-center mt-4">
              <Link
                to="/register"
                id="bottom-register-btn"
                className="inline-flex items-center gap-2 rounded-full font-sans font-semibold text-sm px-6 py-3 transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "var(--color-ice)", color: "var(--color-primary)" }}
              >
                Secure your spot — Register Free
              </Link>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
