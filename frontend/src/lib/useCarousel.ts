/**
 * useCarousel — shared hook wrapping Embla + Autoplay plugin.
 *
 * Features:
 *  - Autoplay with configurable interval
 *  - Pauses on pointer-down (touch / mouse press) and resumes on release
 *  - Respects prefers-reduced-motion: disables autoplay entirely when true
 *  - Exposes selectedIndex, canScrollPrev/Next for UI controls
 */

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const PREFERS_REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface UseCarouselOptions {
  /** Autoplay delay in ms. Default 4000. */
  delay?: number;
  /** Loop slides. Default true. */
  loop?: boolean;
}

export function useCarousel({ delay = 4000, loop = true }: UseCarouselOptions = {}) {
  const reduced = PREFERS_REDUCED();

  const autoplay = useRef(
    Autoplay({ delay, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop }, reduced ? [] : [autoplay.current]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateState = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", updateState);
    emblaApi.on("reInit", updateState);
    updateState();
    return () => {
      emblaApi.off("select", updateState);
      emblaApi.off("reInit", updateState);
    };
  }, [emblaApi, updateState]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return { emblaRef, emblaApi, selectedIndex, canPrev, canNext, scrollPrev, scrollNext, scrollTo };
}
