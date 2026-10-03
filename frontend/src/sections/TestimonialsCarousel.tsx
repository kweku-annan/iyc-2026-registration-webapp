/**
 * TestimonialsCarousel — rotating quote cards.
 *
 * Data source: static PLACEHOLDER_TESTIMONIALS (replaced by
 * GET /testimonials/featured in T16 once that endpoint is live).
 *
 * Features:
 *  - Embla carousel, 1-slide peek on mobile / 2 on desktop (via CSS)
 *  - Autoplay 4 s, pauses on hover/touch, respects prefers-reduced-motion
 *  - CTA "Share your testimony" button
 *  - Gracefully hides if no testimonials are available
 */

import { Link } from "react-router-dom";
import { useCarousel } from "../lib/useCarousel";
import { useTestimonialsFeatured, type TestimonialPublic } from "../lib/queries";
function QuoteCard({ item }: { item: TestimonialPublic }) {
  return (
    <div
      className="shrink-0 px-3"
      style={{ flex: "0 0 min(100%, 400px)" }}
    >
      <div
        className="h-full flex flex-col gap-5 rounded-2xl p-6 sm:p-7"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(103,163,177,0.2)",
          backdropFilter: "blur(12px)",
          minHeight: 220,
        }}
      >
        {/* Quote mark */}
        <span
          className="font-serif"
          style={{ fontSize: "3.5rem", lineHeight: 0.8, color: "rgba(216,245,249,0.3)" }}
          aria-hidden="true"
        >
          "
        </span>

        {/* Body */}
        <p
          className="font-sans text-sm sm:text-base leading-relaxed flex-1"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          {item.body}
        </p>

        {/* Attribution */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-sans font-bold text-sm shrink-0"
            style={{ background: "rgba(103,163,177,0.25)", color: "var(--color-ice)" }}
            aria-hidden="true"
          >
            {item.computed_name.charAt(0)}
          </div>
          <div>
            <p className="font-sans font-medium text-sm" style={{ color: "var(--color-ice)" }}>
              {item.computed_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsCarousel() {
  const { data: items = [], isLoading } = useTestimonialsFeatured();
  const { emblaRef, selectedIndex, scrollTo } = useCarousel({ delay: 4000 });

  if (isLoading || items.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="py-20 px-2"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
      aria-roledescription="carousel"
      aria-label="Attendee testimonials"
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center px-3 mb-10">
          <p
            className="font-sans text-xs uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--color-highlight)" }}
          >
            What attendees say
          </p>
          <h2
            className="font-serif"
            style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
          >
            Testimonials
          </h2>
        </div>

        {/* Carousel */}
        <div ref={emblaRef} style={{ overflow: "hidden" }}>
          <div
            className="flex"
            style={{ touchAction: "pan-y" }}
            aria-live="off"
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Testimonial ${i + 1} of ${items.length}`}
                className="shrink-0"
                style={{ flex: "0 0 min(100%, 420px)", paddingInline: "0.75rem" }}
              >
                <QuoteCard item={item} />
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div
          className="flex justify-center gap-2 mt-6"
          role="tablist"
          aria-label="Testimonial indicators"
        >
          {items.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={selectedIndex === i}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => scrollTo(i)}
              style={{
                width: selectedIndex === i ? 20 : 8,
                height: 8,
                borderRadius: 999,
                background: selectedIndex === i ? "var(--color-ice)" : "rgba(255,255,255,0.25)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            to="/testimony"
            id="share-testimony-btn"
            className="inline-flex items-center gap-2 rounded-full font-sans font-medium text-sm px-5 py-2.5 transition-all duration-200 hover:opacity-80"
            style={{
              border: "1px solid rgba(103,163,177,0.4)",
              color: "var(--color-ice)",
              background: "rgba(216,245,249,0.06)",
            }}
          >
            <span aria-hidden="true">💬</span>
            Share your testimony
          </Link>
        </div>
      </div>
    </section>
  );
}
