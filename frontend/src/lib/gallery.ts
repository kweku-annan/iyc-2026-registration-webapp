/**
 * gallery.ts — typed helpers for gallery data.
 *
 * Dynamically fetches published photos from backend API /gallery,
 * resolving media URLs via getMediaUrl.
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
  const res = await fetch(`${API_BASE}/gallery`);
  if (!res.ok) {
    throw new Error(`Failed to load gallery photos (HTTP ${res.status})`);
  }
  const data = (await res.json()) as GalleryManifest;
  return {
    ...data,
    items: (data.items || []).map((item) => ({
      ...item,
      id: String(item.id),
      thumb: getMediaUrl(item.thumb),
      full: getMediaUrl(item.full),
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
