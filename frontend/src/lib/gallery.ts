/**
 * gallery.ts — typed helpers for gallery.json.
 *
 * Usage:
 *   import { useGallery, type GalleryItem } from "../lib/gallery";
 */

import { useQuery } from "@tanstack/react-query";

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  year: number;
  thumb: string;
  full: string;
  width: number;
  height: number;
  alt: string;
}

export interface GalleryManifest {
  items: GalleryItem[];
}

async function fetchGallery(): Promise<GalleryManifest> {
  const res = await fetch("/gallery/gallery.json");
  if (!res.ok) throw new Error("Failed to load gallery");
  return res.json() as Promise<GalleryManifest>;
}

export function useGallery() {
  return useQuery<GalleryManifest, Error>({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
