/**
 * HeroCarousel — full-viewport hero slideshow.
 *
 * Slides are defined in HERO_SLIDES below. Each slide has a unique
 * gradient background, a scripture/theme line, and a sub-caption.
 * Replace or extend the array before launch.
 *
 * Features:
 *  - Embla carousel with autoplay (5 s), pauses on hover/touch
 *  - prefers-reduced-motion → autoplay disabled
 *  - Dot indicators + prev/next arrows
 *  - CTA carried through all slides
 */

import { Link } from "react-router-dom";
import { useCarousel } from "../lib/useCarousel";

interface HeroSlide {
  id: string;
  tag: string;
  heading: string;
  sub: string;
  gradient: string;
  glowColor: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide-theme",
    tag: "IYC Camp Meeting 2026",
    heading: "The Rain of\nHis Spirit",
    sub: "Come, Experience the Power of the Holy Spirit",
    gradient: "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(228,215,196,0.12) 0%, transparent 70%)",
    glowColor: "rgba(216,245,249,0.35)",
  },
  {
    id: "slide-worship",
    tag: "23 – 26 December 2026",
    heading: "Four Days of\nPraise & Worship",
    sub: "Powerful services, inspiring messages, unforgettable fellowship",
    gradient: "radial-gradient(ellipse 60% 55% at 40% 50%, rgba(103,163,177,0.18) 0%, transparent 70%)",
    glowColor: "rgba(103,163,177,0.45)",
  },
  {
    id: "slide-community",
    tag: "International Youth For Christ",
    heading: "Youth Rising\nTogether",
    sub: "Young people from across Ghana and beyond, united in one Spirit",
    gradient: "radial-gradient(ellipse 65% 50% at 60% 45%, rgba(71,140,161,0.18) 0%, transparent 70%)",
    glowColor: "rgba(71,140,161,0.4)",
  },
];

// Decorative rain drop
function RainDrop({ style }: { style: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 2,
        borderRadius: 999,
        background: "linear-gradient(to bottom, transparent, rgba(216,245,249,0.55))",
        animation: "hero-rain linear infinite",
        ...style,
      }}
    />
  );
}

const DROPS = [
  { left: "8%",  h: 40, delay: "0s",   dur: "2.2s" },
  { left: "20%", h: 60, delay: "0.5s", dur: "2.8s" },
  { left: "33%", h: 35, delay: "0.9s", dur: "2.4s" },
  { left: "50%", h: 70, delay: "0.2s", dur: "3.0s" },
  { left: "63%", h: 45, delay: "1.1s", dur: "2.6s" },
  { left: "76%", h: 55, delay: "0.6s", dur: "2.2s" },
  { left: "88%", h: 65, delay: "0.3s", dur: "2.5s" },
];

interface HeroCarouselProps {
  isOpen: boolean;
}

export function HeroCarousel({ isOpen }: HeroCarouselProps) {
  const { emblaRef, selectedIndex, scrollPrev, scrollNext, scrollTo } = useCarousel({
    delay: 5000,
  });

  return (
    <section
      id="hero"
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="IYC-2026 highlights"
    >
      <style>{`
        @keyframes hero-rain {
          from { transform: translateY(-10%); opacity: 1; }
          to   { transform: translateY(110vh);  opacity: 0; }
        }
        @keyframes float-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-slide-content { animation: none !important; }
        }
      `}</style>

      {/* Rain drops (decorative, always visible) */}
      {DROPS.map((d, i) => (
        <RainDrop
          key={i}
          style={{ left: d.left, height: d.h, top: "-10%", animationDelay: d.delay, animationDuration: d.dur }}
        />
      ))}

      {/* Embla viewport */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <div className="flex" style={{ touchAction: "pan-y" }}>
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={slide.id}
              className="relative shrink-0 w-full flex flex-col items-center justify-center text-center px-5"
              style={{ minHeight: "92dvh" }}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${HERO_SLIDES.length}`}
            >
              {/* Per-slide glow */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: slide.gradient,
                  pointerEvents: "none",
                }}
              />

              {/* Content */}
              <div
                className="relative z-10 flex flex-col items-center gap-6 max-w-3xl hero-slide-content"
                style={{ animation: "float-up 0.8s ease both" }}
              >
                <p
                  className="font-sans text-xs tracking-[0.3em] uppercase"
                  style={{ color: "var(--color-highlight)" }}
                >
                  {slide.tag}
                </p>

                <h1
                  className="font-serif leading-tight"
                  style={{
                    fontSize: "clamp(2.6rem, 8vw, 6rem)",
                    color: "var(--color-ice)",
                    textShadow: `0 0 80px ${slide.glowColor}, 0 0 40px ${slide.glowColor}80`,
                    letterSpacing: "-0.01em",
                    whiteSpace: "pre-line",
                  }}
                >
                  {slide.heading}
                </h1>

                <p
                  className="font-sans text-base sm:text-xl max-w-md leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {slide.sub}
                </p>

                <div
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-sm font-medium"
                  style={{
                    background: "rgba(103,163,177,0.2)",
                    border: "1px solid rgba(103,163,177,0.4)",
                    color: "var(--color-ice)",
                  }}
                >
                  <span aria-hidden="true">📅</span>
                  <span>23 – 26 December 2026</span>
                </div>

                {isOpen ? (
                  <Link
                    to="/register"
                    id={`${slide.id}-register-btn`}
                    className="mt-2 inline-flex items-center gap-2 rounded-full font-sans font-semibold text-base px-8 py-4 transition-all duration-300 hover:scale-[1.04]"
                    style={{
                      background: "var(--color-ice)",
                      color: "var(--color-primary)",
                      boxShadow: "0 0 40px rgba(216,245,249,0.3), 0 4px 24px rgba(0,0,0,0.2)",
                    }}
                  >
                    Register — It's Free
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </Link>
                ) : (
                  <div
                    className="mt-2 px-8 py-4 rounded-full font-sans font-semibold text-base"
                    style={{
                      background: "rgba(103,163,177,0.15)",
                      border: "1px solid rgba(103,163,177,0.3)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Registration has closed
                  </div>
                )}

                {/* Quick nav (only show on first slide to avoid clutter) */}
                {i === 0 && (
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {["#programme", "#venue", "#faq", "#contact"].map((href) => (
                      <a
                        key={href}
                        href={href}
                        className="font-sans text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 hover:opacity-80"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.6)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        {href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next */}
      {HERO_SLIDES.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              backdropFilter: "blur(8px)",
            }}
          >
            ‹
          </button>
          <button
            onClick={scrollNext}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              backdropFilter: "blur(8px)",
            }}
          >
            ›
          </button>
        </>
      )}

      {/* Dot indicators */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={selectedIndex === i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => scrollTo(i)}
            className="transition-all duration-300"
            style={{
              width: selectedIndex === i ? 24 : 8,
              height: 8,
              borderRadius: 999,
              background: selectedIndex === i ? "var(--color-ice)" : "rgba(255,255,255,0.3)",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
}
