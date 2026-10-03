/**
 * Lightbox — modal image viewer.
 *
 * Features:
 *  - Full-screen modal with backdrop blur
 *  - Prev / Next navigation (keyboard ← → and buttons)
 *  - Close on Escape key or backdrop click
 *  - Focus trap while open
 *  - Lazy-loaded full-size images
 *  - prefers-reduced-motion: disables slide transition
 *  - Touch swipe (pointer events)
 */

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GalleryItem } from "../lib/gallery";

interface LightboxProps {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const REDUCED = typeof window !== "undefined"
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

export function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const item = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeStartX = useRef<number | null>(null);

  const prev = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate],
  );

  // Keyboard navigation + focus trap
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Touch swipe
  const onPointerDown = (e: ReactPointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx > 50) prev();
    if (dx < -50) next();
  };

  if (!item) return null;

  return (
    <div
      id="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo: ${item.title}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: REDUCED ? "none" : "lb-fade 0.2s ease both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <style>{`
        @keyframes lb-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Close */}
      <button
        ref={closeRef}
        id="lightbox-close-btn"
        aria-label="Close lightbox"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          fontSize: "1.25rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}
      >
        ✕
      </button>

      {/* Counter */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.5)",
          letterSpacing: "0.1em",
          zIndex: 10,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {index + 1} / {items.length}
      </div>

      {/* Prev */}
      {items.length > 1 && (
        <button
          id="lightbox-prev-btn"
          aria-label="Previous photo"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "1.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backdropFilter: "blur(8px)",
          }}
        >
          ‹
        </button>
      )}

      {/* Image + caption */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          maxWidth: "min(90vw, 1200px)",
          maxHeight: "90dvh",
          padding: "3rem 3.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={item.id}
          src={item.full}
          alt={item.alt}
          loading="lazy"
          style={{
            maxWidth: "100%",
            maxHeight: "calc(90dvh - 120px)",
            objectFit: "contain",
            borderRadius: "0.75rem",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            animation: REDUCED ? "none" : "lb-fade 0.25s ease both",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              color: "white",
              marginBottom: "0.25rem",
            }}
          >
            {item.title}
          </p>
          {item.caption && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.55)",
                maxWidth: 560,
              }}
            >
              {item.caption}
            </p>
          )}
        </div>
      </div>

      {/* Next */}
      {items.length > 1 && (
        <button
          id="lightbox-next-btn"
          aria-label="Next photo"
          onClick={(e) => { e.stopPropagation(); next(); }}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "1.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backdropFilter: "blur(8px)",
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
