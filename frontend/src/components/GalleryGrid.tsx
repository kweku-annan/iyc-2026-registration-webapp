/**
 * GalleryGrid — shared grid + lightbox, used by GallerySection and GalleryPage.
 *
 * Renders a responsive CSS grid of thumbnail images. Clicking any image
 * opens the Lightbox. The first `previewCount` items are shown;
 * pass `previewCount={Infinity}` for the full gallery page.
 */

import { useState } from "react";
import { Lightbox } from "../components/Lightbox";
import type { GalleryItem } from "../lib/gallery";

interface GalleryGridProps {
  items: GalleryItem[];
  previewCount?: number;
}

export function GalleryGrid({ items, previewCount = Infinity }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const visible = items.slice(0, previewCount);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {visible.map((item, i) => (
          <button
            key={item.id}
            id={`gallery-item-${item.id}`}
            aria-label={`Open photo: ${item.title}`}
            onClick={() => setLightboxIndex(i)}
            style={{
              display: "block",
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              overflow: "hidden",
              borderRadius: "0.875rem",
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: "rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              const img = e.currentTarget.querySelector("img");
              const overlay = e.currentTarget.querySelector(".gallery-overlay") as HTMLElement | null;
              if (img) img.style.transform = "scale(1.06)";
              if (overlay) overlay.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const img = e.currentTarget.querySelector("img");
              const overlay = e.currentTarget.querySelector(".gallery-overlay") as HTMLElement | null;
              if (img) img.style.transform = "scale(1)";
              if (overlay) overlay.style.opacity = "0";
            }}
          >
            <img
              src={item.thumb}
              alt={item.alt}
              loading="lazy"
              width={item.width}
              height={item.height}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.4s ease",
              }}
            />
            {/* Hover overlay */}
            <div
              className="gallery-overlay"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
                opacity: 0,
                transition: "opacity 0.3s ease",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "0.875rem",
                pointerEvents: "none",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "0.9rem",
                  color: "white",
                  textAlign: "left",
                  lineHeight: 1.3,
                }}
              >
                {item.title}
              </p>
            </div>
          </button>
        ))}
      </div>

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
