/**
 * PartnersCarousel — partner church / sponsor logo strip.
 *
 * Data source: static PLACEHOLDER_PARTNERS (replaced by
 * GET /partners in T17 once that endpoint is live).
 *
 * Features:
 *  - Embla carousel, peek-style (multiple logos visible at once)
 *  - Autoplay 3 s, pauses on hover, respects prefers-reduced-motion
 *  - Lazy-loaded logos via loading="lazy"
 *  - Falls back to a styled initial-letter badge when logo_url is null
 *  - Hides entirely if the partners array is empty
 */

import { useCarousel } from "../lib/useCarousel";
import { usePartners, type Partner } from "../lib/queries";

function PartnerCard({ partner }: { partner: Partner }) {
  const initials = partner.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const inner = (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-5 py-6 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(103,163,177,0.15)",
        minHeight: 130,
        justifyContent: "center",
      }}
    >
      {partner.logo_url ? (
        <img
          src={partner.logo_url}
          alt={partner.name}
          loading="lazy"
          width={80}
          height={48}
          style={{ objectFit: "contain", maxHeight: 48, filter: "brightness(0) invert(1) opacity(0.7)" }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-xl font-serif font-semibold"
          style={{
            width: 60,
            height: 60,
            background: "rgba(103,163,177,0.2)",
            color: "var(--color-ice)",
            fontSize: "1.25rem",
            letterSpacing: "0.05em",
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}
    </div>
  );

  if (partner.website_url) {
    return (
      <a
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={partner.name}
        className="block no-underline"
        onMouseEnter={(e) => {
          const el = e.currentTarget.firstElementChild as HTMLElement;
          if (el) { el.style.borderColor = "rgba(103,163,177,0.4)"; el.style.background = "rgba(216,245,249,0.07)"; }
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget.firstElementChild as HTMLElement;
          if (el) { el.style.borderColor = "rgba(103,163,177,0.15)"; el.style.background = "rgba(255,255,255,0.05)"; }
        }}
      >
        {inner}
      </a>
    );
  }

  return <div aria-label={partner.name}>{inner}</div>;
}

export function PartnersCarousel() {
  const { data: partners = [], isLoading } = usePartners();
  const { emblaRef } = useCarousel({ delay: 3000 });

  if (!isLoading && partners.length === 0) return null;

  return (
    <section
      id="partners"
      className="py-20 px-2"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
      aria-roledescription="carousel"
      aria-label="Partner churches"
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center px-3 mb-10">
          <p
            className="font-sans text-xs uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-highlight)" }}
          >
            United in one Spirit
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            Partner Churches
          </h2>
        </div>

        {/* Carousel viewport */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-2 border-ice border-t-transparent animate-spin" />
          </div>
        ) : (
          <div ref={emblaRef} style={{ overflow: "hidden" }}>
            <div
              className="flex"
              style={{ touchAction: "pan-y" }}
              aria-live="off"
            >
              {partners.map((p, i) => (
                <div
                  key={p.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Partner ${i + 1} of ${partners.length}`}
                  className="shrink-0 px-2"
                  style={{ flex: "0 0 min(100%, 200px)" }}
                >
                  <PartnerCard partner={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "Your church here" nudge */}
        <p
          className="text-center font-sans text-xs mt-6"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Partner churches are still being confirmed. More to be announced.
        </p>
      </div>
    </section>
  );
}
