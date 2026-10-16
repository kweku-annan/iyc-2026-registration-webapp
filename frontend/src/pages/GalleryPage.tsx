/**
 * GalleryPage — complete exhibition archive at /gallery.
 *
 * Shows all photos from gallery.json in an adaptive multi-column masonry
 * layout with live category filtering, image count, and full lightbox.
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components";
import { useGallery } from "../lib/gallery";
import { GalleryGrid } from "../components/GalleryGrid";
import { ArrowLeft, Images, Sparkles } from "lucide-react";

export function GalleryPage() {
  const { data, isLoading, isError } = useGallery();
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

  // Filtered items
  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <Layout>
      <div className="min-h-dvh px-4 sm:px-6 py-12 sm:py-16 max-w-7xl mx-auto">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-8">
          <Link
            to="/#gallery"
            id="gallery-back-link"
            className="inline-flex items-center gap-2 font-sans text-xs sm:text-sm uppercase tracking-wider mb-6 transition-all duration-200 hover:text-[var(--color-ice)] hover:-translate-x-1"
            style={{ color: "rgba(216,245,249,0.7)" }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans uppercase tracking-[0.2em] mb-3"
                style={{
                  background: "rgba(103,163,177,0.15)",
                  color: "var(--color-ice)",
                  border: "1px solid rgba(103,163,177,0.3)",
                }}
              >
                <Sparkles size={13} className="text-[var(--color-ice)]" />
                <span>Complete Archive</span>
              </div>
              <h1
                className="font-serif leading-none"
                style={{ fontSize: "clamp(2.2rem,6vw,4rem)", color: "var(--color-ice)" }}
              >
                Exhibition Gallery
              </h1>
              <p
                className="font-sans text-sm sm:text-base mt-2 max-w-2xl"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Explore every captured moment from past IYC camp meetings — worship, intercession,
                expository ministry, and brotherly fellowship.
              </p>
            </div>

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans tracking-wide shrink-0 self-start md:self-end"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(103,163,177,0.2)",
                color: "var(--color-ice)",
              }}
            >
              <Images size={15} />
              <span>Showing {filteredItems.length} of {items.length} Photos</span>
            </div>
          </div>
        </div>

        {/* ── Category Filter Tabs ───────────────────────────── */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8 scroll-smooth">
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

        {/* ── Loading Skeleton ───────────────────────────────── */}
        {isLoading && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-2xl bg-white/5 animate-pulse"
                style={{
                  height: `${220 + (i % 3) * 60}px`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {isError && (
          <div className="py-20 text-center">
            <p className="font-sans text-sm text-red-300">
              Failed to load gallery photos. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* ── Content: Adaptive Masonry ─────────────────────── */}
        {!isLoading && !isError && items.length === 0 && (
          <p
            className="font-sans text-sm py-16 text-center"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Gallery photos coming soon.
          </p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <GalleryGrid
            items={filteredItems}
            previewCount={Infinity}
            variant="masonry"
          />
        )}
      </div>
    </Layout>
  );
}
