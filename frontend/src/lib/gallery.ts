/**
 * gallery.ts — typed helpers for gallery data.
 *
 * Dynamically fetches published photos from backend API /gallery,
 * resolving media URLs and falling back to static /gallery/gallery.json if offline.
 */

import { useQuery } from "@tanstack/react-query";
import { getMediaUrl } from "./api";

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  category?: string;
  year: number;
  thumb: string;
  full: string;
  width: number;
  height: number;
  alt: string;
}

export interface GalleryManifest {
  items: GalleryItem[];
  categories?: string[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function fetchGallery(): Promise<GalleryManifest> {
  try {
    const res = await fetch(`${API_BASE}/gallery`);
    if (res.ok) {
      const data = (await res.json()) as GalleryManifest;
      if (data.items && data.items.length > 0) {
        return {
          ...data,
          items: data.items.map((item) => ({
            ...item,
            id: String(item.id),
            thumb: getMediaUrl(item.thumb),
            full: getMediaUrl(item.full),
          })),
        };
      }
    }
  } catch {
    // Fall back to static manifest if backend endpoint is unreachable
  }

  // Fallback to static manifest
  const staticRes = await fetch("/gallery/gallery.json");
  if (!staticRes.ok) throw new Error("Failed to load gallery");
  const staticData = (await staticRes.json()) as GalleryManifest;
  return {
    ...staticData,
    items: (staticData.items || []).map((item) => ({
      ...item,
      id: String(item.id),
      thumb: item.thumb.startsWith("/uploads/") ? getMediaUrl(item.thumb) : item.thumb,
      full: item.full.startsWith("/uploads/") ? getMediaUrl(item.full) : item.full,
    })),
  };
}

export function useGallery() {
  return useQuery<GalleryManifest, Error>({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
    staleTime: 60 * 1000, // 1 min freshness
  });
}
