/**
 * GalleryPage — full gallery at /gallery.
 *
 * Shows all photos in gallery.json in a responsive grid with lightbox.
 * Groups items by year with year-headings.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components";
import { useGallery } from "../lib/gallery";
import { GalleryGrid } from "../components/GalleryGrid";

export function GalleryPage() {
  const { data, isLoading, isError } = useGallery();
  const items = data?.items ?? [];

  // Group by year
  const byYear = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const item of items) {
      const arr = map.get(item.year) ?? [];
      arr.push(item);
      map.set(item.year, arr);
    }
    // Descending year order
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [items]);

  return (
    <Layout>
      <div className="min-h-dvh px-5 py-16" style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Back link + heading */}
        <div className="mb-10">
          <Link
            to="/#gallery"
            id="gallery-back-link"
            className="inline-flex items-center gap-2 font-sans text-sm mb-6 transition-opacity hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            ← Back to home
          </Link>
          <h1
            className="font-serif"
            style={{ fontSize: "clamp(2rem,6vw,4rem)", color: "var(--color-ice)" }}
          >
            Gallery
          </h1>
          <p
            className="font-sans text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Moments from past IYC camp meetings.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "4/3",
                  borderRadius: "0.875rem",
                  background: "rgba(255,255,255,0.06)",
                  animation: "pulse-skeleton 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <p className="font-sans text-sm" style={{ color: "#fca5a5" }}>
            Failed to load gallery. Please try refreshing the page.
          </p>
        )}

        {/* Content: grouped by year */}
        {!isLoading && !isError && byYear.length === 0 && (
          <p
            className="font-sans text-sm py-10 text-center"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Gallery photos coming soon.
          </p>
        )}

        {!isLoading && byYear.map(([year, yearItems]) => (
          <div key={year} className="mb-14">
            <h2
              className="font-serif mb-5"
              style={{ fontSize: "1.5rem", color: "rgba(255,255,255,0.5)" }}
            >
              {year}
            </h2>
            <GalleryGrid items={yearItems} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Layout>
  );
}
