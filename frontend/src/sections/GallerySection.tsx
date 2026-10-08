/**
 * GallerySection — homepage gallery preview (first 6 photos) with "View all" link.
 */

import { Link } from "react-router-dom";
import { useGallery } from "../lib/gallery";
import { GalleryGrid } from "../components/GalleryGrid";
import { Image } from "lucide-react";

const PREVIEW_COUNT = 6;

export function GallerySection() {
  const { data, isLoading } = useGallery();
  const items = data?.items ?? [];

  return (
    <section
      id="gallery"
      className="py-20 px-5"
      style={{ borderTop: "1px solid rgba(103,163,177,0.12)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p
              className="font-sans text-xs uppercase tracking-[0.3em] mb-2"
              style={{ color: "var(--color-highlight)" }}
            >
              Highlights from past meetings
            </p>
            <h2
              className="font-serif"
              style={{ fontSize: "clamp(1.8rem,5vw,3rem)", color: "var(--color-ice)" }}
            >
              Gallery
            </h2>
          </div>
          {items.length > PREVIEW_COUNT && (
            <Link
              to="/gallery"
              id="gallery-view-all-btn"
              className="font-sans text-sm font-medium transition-opacity hover:opacity-70 shrink-0"
              style={{ color: "var(--color-ice)" }}
            >
              View all {items.length} photos →
            </Link>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "4/3",
                  borderRadius: "0.875rem",
                  background: "rgba(255,255,255,0.06)",
                  animation: "pulse-skeleton 1.4s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p
            className="font-sans text-sm text-center py-10"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Gallery photos coming soon.
          </p>
        ) : (
          <GalleryGrid items={items} previewCount={PREVIEW_COUNT} />
        )}

        {/* View all CTA (mobile friendly, below grid) */}
        {items.length > PREVIEW_COUNT && (
          <div className="text-center mt-8">
            <Link
              to="/gallery"
              id="gallery-view-all-bottom-btn"
              className="inline-flex items-center gap-2 rounded-full font-sans font-medium text-sm px-5 py-2.5 transition-all duration-200 hover:opacity-80"
              style={{
                border: "1px solid rgba(103,163,177,0.4)",
                color: "var(--color-ice)",
                background: "rgba(216,245,249,0.06)",
              }}
            >
              <Image size={16} /> View all photos
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </section>
  );
}
