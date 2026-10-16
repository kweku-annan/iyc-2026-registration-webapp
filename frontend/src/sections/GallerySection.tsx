/**
 * GallerySection — homepage curated exhibition showcase.
 *
 * Features:
 *  - High-impact curated bento showcase (7 photos) with prominent hero frame
 *  - Interactive category filter tabs (All Moments, Worship, Ministry, Fellowship, Camp)
 *  - Seamless category switching with instant UI update
 *  - Tactile art gallery frames with glass plaques and lightbox modal
 *  - Dedicated "View All (40) Moments" portal to the full gallery page
 *  - Responsive across all mobile, tablet, and desktop devices
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useGallery } from "../lib/gallery";
import { GalleryGrid } from "../components/GalleryGrid";
import { Images, ArrowRight, Sparkles } from "lucide-react";

const PREVIEW_COUNT = 7;

export function GallerySection() {
  const { data, isLoading } = useGallery();
  const items = useMemo(() => data?.items ?? [], [data]);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Extract unique categories & counts dynamically
  const categories = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    const discovered = new Set<string>();
    for (const item of items) {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
        discovered.add(item.category);
      }
    }
    const preferredOrder = ["All", "Worship & Praise", "Word & Ministry", "Fellowship & Community", "Camp Atmosphere"];
    const ordered = [
      ...preferredOrder.filter((cat) => (counts[cat] ?? 0) > 0),
      ...Array.from(discovered).filter((cat) => !preferredOrder.includes(cat)),
    ];
    return ordered.map((cat) => ({
      name: cat,
      count: counts[cat] ?? 0,
    }));
  }, [items]);

  // Filter items by active category
  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <section
      id="gallery"
      className="py-20 px-4 sm:px-6 relative overflow-hidden"
      style={{
        borderTop: "1px solid rgba(103,163,177,0.15)",
        background: "linear-gradient(180deg, rgba(6,19,26,0.2) 0%, rgba(6,19,26,0.6) 100%)",
      }}
    >
      {/* Decorative ambient glow */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, var(--color-highlight) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ── Section Header ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans uppercase tracking-[0.2em] mb-3"
              style={{
                background: "rgba(103,163,177,0.15)",
                color: "var(--color-ice)",
                border: "1px solid rgba(103,163,177,0.3)",
              }}
            >
              <Sparkles size={13} className="text-[var(--color-ice)]" />
              <span>Memories of the Spirit</span>
            </div>
            <h2
              className="font-serif leading-none tracking-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", color: "var(--color-ice)" }}
            >
              Exhibition Gallery
            </h2>
            <p
              className="font-sans text-sm sm:text-base mt-2 max-w-xl"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Moments of fervent prayer, unhindered praise, and lifelong bonds
              forged in the presence of God during previous IYC camp meetings.
            </p>
          </div>

          {items.length > PREVIEW_COUNT && (
            <Link
              to="/gallery"
              id="gallery-view-all-btn"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-sans text-xs tracking-wider uppercase font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg shrink-0"
              style={{
                background: "rgba(216,245,249,0.1)",
                color: "var(--color-ice)",
                border: "1px solid rgba(216,245,249,0.3)",
              }}
            >
              <Images size={15} />
              <span>Explore All {items.length} Photos</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* ── Category Filter Pills ─────────────────────────── */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6 scroll-smooth">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-2 rounded-full font-sans text-xs tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "shadow-md scale-[1.02]"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    background: isActive
                      ? "rgba(216,245,249,0.18)"
                      : "rgba(255,255,255,0.05)",
                    color: isActive ? "var(--color-ice)" : "rgba(255,255,255,0.75)",
                    border: isActive
                      ? "1px solid rgba(216,245,249,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span>{cat.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full"
                    style={{
                      background: isActive
                        ? "rgba(216,245,249,0.25)"
                        : "rgba(255,255,255,0.1)",
                      color: isActive ? "white" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main Showcase Grid ────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="col-span-2 row-span-2 aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p
            className="font-sans text-sm text-center py-16"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Gallery photos coming soon.
          </p>
        ) : (
          <GalleryGrid
            items={filteredItems}
            previewCount={PREVIEW_COUNT}
            variant="curated"
          />
        )}

        {/* ── View All CTA (Prominent Bottom Action on all devices) ── */}
        {items.length > PREVIEW_COUNT && (
          <div className="mt-10 text-center">
            <Link
              to="/gallery"
              id="gallery-view-all-bottom-btn"
              className="inline-flex items-center gap-2.5 rounded-full font-sans font-medium text-sm px-6 py-3.5 transition-all duration-300 hover:scale-105 hover:shadow-xl group"
              style={{
                border: "1px solid rgba(216,245,249,0.35)",
                color: "var(--color-ice)",
                background: "linear-gradient(135deg, rgba(216,245,249,0.12) 0%, rgba(103,163,177,0.18) 100%)",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
              }}
            >
              <Images size={18} className="text-[var(--color-ice)]" />
              <span>Explore Complete Exhibition Archive ({items.length} Photos)</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
