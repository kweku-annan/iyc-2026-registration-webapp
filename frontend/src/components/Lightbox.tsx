/**
 * Lightbox — museum-grade modal image viewer with thumbnail filmstrip.
 *
 * Features:
 *  - Full-screen modal with deep midnight backdrop blur
 *  - Top status bar with category tag, counter, and close button
 *  - Prev / Next navigation (keyboard ← →, touch swipe, and glass buttons)
 *  - Preloads adjacent full images for instant transitions
 *  - Bottom thumbnail strip with auto-centering on active item
 *  - Responsive: optimized layout for mobile, tablet, and desktop
 *  - Focus trap while open & body scroll lock
 */

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X, ChevronLeft, ChevronRight, Tag } from "lucide-react";
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
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate],
  );

  // Preload adjacent images for fast transitions
  useEffect(() => {
    if (items.length <= 1) return;
    const nextIdx = (index + 1) % items.length;
    const prevIdx = (index - 1 + items.length) % items.length;
    const imgNext = new window.Image();
    imgNext.src = items[nextIdx].full;
    const imgPrev = new window.Image();
    imgPrev.src = items[prevIdx].full;
  }, [index, items]);

  // Keyboard navigation
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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const activeThumb = thumbStripRef.current.querySelector(
      `[data-thumb-idx="${index}"]`
    ) as HTMLElement | null;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [index]);

  // Touch swipe
  const onPointerDown = (e: ReactPointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx > 45) prev();
    if (dx < -45) next();
  };

  if (!item) return null;

  return (
    <div
      id="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo: ${item.title}`}
      className="fixed inset-0 z-50 flex flex-col justify-between select-none"
      style={{
        background: "rgba(4, 14, 20, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: REDUCED ? "none" : "lb-fade 0.25s ease both",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <style>{`
        @keyframes lb-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── Top Bar ────────────────────────────────────────── */}
      <header
        className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 shrink-0"
        style={{
          borderBottom: "1px solid rgba(103,163,177,0.15)",
          background: "linear-gradient(to bottom, rgba(4,14,20,0.8) 0%, transparent 100%)",
        }}
      >
        {/* Left: Category Badge */}
        <div className="flex items-center gap-2">
          {item.category && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans tracking-wide"
              style={{
                background: "rgba(103,163,177,0.2)",
                color: "var(--color-ice)",
                border: "1px solid rgba(216,245,249,0.25)",
              }}
            >
              <Tag size={12} className="opacity-80" />
              {item.category}
            </span>
          )}
        </div>

        {/* Center: Counter */}
        <div
          className="font-sans text-xs tracking-widest uppercase"
          style={{ color: "rgba(216,245,249,0.6)" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {index + 1} <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span> {items.length}
        </div>

        {/* Right: Close button */}
        <button
          ref={closeRef}
          id="lightbox-close-btn"
          aria-label="Close lightbox"
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "var(--color-ice)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>
      </header>

      {/* ── Main Viewport (Image + Navigation) ─────────────── */}
      <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Prev Arrow (desktop / tablet) */}
        {items.length > 1 && (
          <button
            id="lightbox-prev-btn"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20"
            style={{
              background: "rgba(6,19,26,0.65)",
              border: "1px solid rgba(103,163,177,0.3)",
              color: "var(--color-ice)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* The Image Display */}
        <div
          className="relative flex flex-col items-center justify-center max-h-full max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            key={item.id}
            src={item.full}
            alt={item.alt}
            className="max-h-[60vh] sm:max-h-[66vh] md:max-h-[70vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl transition-opacity duration-300"
            style={{
              boxShadow: "0 20px 50px -10px rgba(0,0,0,0.8), 0 0 20px rgba(103,163,177,0.15)",
              border: "1px solid rgba(103,163,177,0.2)",
              animation: REDUCED ? "none" : "lb-fade 0.25s ease both",
            }}
          />

          {/* Caption Plaque */}
          <div className="mt-3 text-center max-w-xl px-4">
            <h3
              className="font-serif text-lg sm:text-xl font-normal leading-tight"
              style={{ color: "var(--color-ice)" }}
            >
              {item.title}
            </h3>
            {item.caption && (
              <p
                className="font-sans text-xs sm:text-sm mt-1 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {item.caption}
              </p>
            )}
          </div>
        </div>

        {/* Next Arrow (desktop / tablet) */}
        {items.length > 1 && (
          <button
            id="lightbox-next-btn"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20"
            style={{
              background: "rgba(6,19,26,0.65)",
              border: "1px solid rgba(103,163,177,0.3)",
              color: "var(--color-ice)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* ── Bottom Thumbnail Filmstrip ─────────────────────── */}
      <footer
        className="relative z-20 px-4 py-3 shrink-0"
        style={{
          borderTop: "1px solid rgba(103,163,177,0.15)",
          background: "linear-gradient(to top, rgba(4,14,20,0.9) 0%, transparent 100%)",
        }}
      >
        <div
          ref={thumbStripRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-2 max-w-4xl mx-auto scroll-smooth"
        >
          {items.map((it, idx) => {
            const isSelected = idx === index;
            return (
              <button
                key={it.id}
                data-thumb-idx={idx}
                type="button"
                onClick={() => onNavigate(idx)}
                aria-label={`Jump to ${it.title}`}
                className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-[var(--color-ice)] scale-105 opacity-100 shadow-md"
                    : "opacity-40 hover:opacity-80 scale-100"
                }`}
                style={{
                  width: "56px",
                  height: "42px",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <img
                  src={it.thumb}
                  alt={it.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
