/**
 * GalleryGrid — shared responsive gallery exhibition component.
 *
 * Supports two exhibition layouts:
 *  - "curated": Asymmetrical editorial bento grid for the landing page showcase.
 *  - "masonry": Fluid multi-column masonry for the complete archive (/gallery).
 *
 * Features:
 *  - Tactile gallery frames with subtle glass borders & ambient shadows
 *  - Micro-zoom hover animation (prefers-reduced-motion respected)
 *  - Integrated museum-grade Lightbox with filmstrip navigation
 *  - Accessible keyboard & screen-reader tags
 */

import { useState } from "react";
import { Lightbox } from "../components/Lightbox";
import type { GalleryItem } from "../lib/gallery";
import { Maximize2, Tag } from "lucide-react";

interface GalleryGridProps {
  items: GalleryItem[];
  previewCount?: number;
  variant?: "curated" | "masonry";
}

export function GalleryGrid({
  items,
  previewCount = Infinity,
  variant = "curated",
}: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const visible = items.slice(0, previewCount);

  if (visible.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-sans text-sm text-white/50">
          No moments found in this category.
        </p>
      </div>
    );
  }

  return (
    <>
      {variant === "masonry" ? (
        /* ── Masonry Layout (Adaptive columns for full archive) ── */
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {visible.map((item, i) => (
            <div
              key={item.id}
              className="break-inside-avoid"
            >
              <button
                type="button"
                id={`gallery-masonry-item-${item.id}`}
                aria-label={`View photo: ${item.title}`}
                onClick={() => setLightboxIndex(i)}
                className="group relative w-full block text-left overflow-hidden rounded-2xl cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-ice)] transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(103,163,177,0.22)",
                  boxShadow: "0 8px 24px -6px rgba(0,0,0,0.4)",
                }}
              >
                <img
                  src={item.thumb}
                  alt={item.alt}
                  loading="lazy"
                  width={item.width}
                  height={item.height}
                  className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />

                {/* Museum glass plaque on hover / tap */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(4,14,20,0.92) 0%, rgba(4,14,20,0.4) 60%, transparent 100%)",
                  }}
                >
                  <div className="flex justify-end">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-ice)]"
                      style={{
                        background: "rgba(6,19,26,0.6)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(216,245,249,0.3)",
                      }}
                    >
                      <Maximize2 size={14} />
                    </span>
                  </div>

                  <div>
                    {item.category && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium tracking-wide mb-1.5"
                        style={{
                          background: "rgba(103,163,177,0.3)",
                          color: "var(--color-ice)",
                          border: "1px solid rgba(216,245,249,0.25)",
                        }}
                      >
                        <Tag size={10} className="opacity-80" />
                        {item.category}
                      </span>
                    )}
                    <h4 className="font-serif text-white text-base leading-snug drop-shadow-sm">
                      {item.title}
                    </h4>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* ── Curated Bento Layout (Homepage Showcase) ─────────── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {visible.map((item, i) => {
            // First item gets a prominent hero span on large screens when 4+ items exist
            const isHero = i === 0 && visible.length >= 4;

            return (
              <button
                key={item.id}
                type="button"
                id={`gallery-curated-item-${item.id}`}
                aria-label={`View photo: ${item.title}`}
                onClick={() => setLightboxIndex(i)}
                className={`group relative w-full overflow-hidden rounded-2xl cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[var(--color-ice)] transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 ${
                  isHero
                    ? "col-span-2 row-span-2 aspect-[4/3] md:aspect-auto min-h-[260px] md:min-h-[380px]"
                    : "aspect-[4/3] min-h-[140px] sm:min-h-[180px]"
                }`}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(103,163,177,0.22)",
                  boxShadow: "0 8px 24px -6px rgba(0,0,0,0.4)",
                }}
              >
                <img
                  src={item.thumb}
                  alt={item.alt}
                  loading="lazy"
                  width={item.width}
                  height={item.height}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />

                {/* Subtle persistent category tag on hero for instant context */}
                {isHero && item.category && (
                  <div className="absolute top-3 left-3 z-10 transition-opacity duration-300 group-hover:opacity-0">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans tracking-wide"
                      style={{
                        background: "rgba(6,19,26,0.65)",
                        backdropFilter: "blur(8px)",
                        color: "var(--color-ice)",
                        border: "1px solid rgba(216,245,249,0.3)",
                      }}
                    >
                      <Tag size={12} className="opacity-80" />
                      {item.category}
                    </span>
                  </div>
                )}

                {/* Museum glass plaque on hover & touch */}
                <div
                  className="absolute inset-0 flex flex-col justify-between p-3 sm:p-5 transition-opacity duration-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(4,14,20,0.92) 0%, rgba(4,14,20,0.4) 60%, transparent 100%)",
                  }}
                >
                  <div className="flex justify-end">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-ice)] shadow-lg"
                      style={{
                        background: "rgba(6,19,26,0.6)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(216,245,249,0.3)",
                      }}
                    >
                      <Maximize2 size={14} />
                    </span>
                  </div>

                  <div>
                    {item.category && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium tracking-wide mb-1"
                        style={{
                          background: "rgba(103,163,177,0.3)",
                          color: "var(--color-ice)",
                          border: "1px solid rgba(216,245,249,0.25)",
                        }}
                      >
                        <Tag size={10} className="opacity-80" />
                        {item.category}
                      </span>
                    )}
                    <h4
                      className={`font-serif text-white leading-snug drop-shadow-md ${
                        isHero ? "text-lg sm:text-2xl" : "text-sm sm:text-base"
                      }`}
                    >
                      {item.title}
                    </h4>
                    {isHero && item.caption && (
                      <p className="hidden md:block font-sans text-xs text-white/70 mt-1 line-clamp-2">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <Lightbox
          items={visible}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
