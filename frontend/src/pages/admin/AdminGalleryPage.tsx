/**
 * AdminGalleryPage — full admin management UI for the photo gallery.
 *
 * Capabilities:
 *  - Upload new photos with automatic backend name sanitization and WebP compression
 *  - Assign existing categories or type brand new custom tags
 *  - Edit photo titles, descriptions, categories, and sort order
 *  - Instant toggle to hide / unhide photos from public view
 *  - Permanent photo deletion with disk cleanup
 *  - Live search and category filtering
 */

import { useState, useMemo } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import {
  useAdminGalleryPhotos,
  useUploadGalleryPhoto,
  useUpdateGalleryPhoto,
  useDeleteGalleryPhoto,
  type AdminGalleryPhoto,
} from "../../lib/queries";
import { getMediaUrl } from "../../lib/api";
import {
  Upload,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Search,
  Tag,
  Images,
  X,
} from "lucide-react";

export function AdminGalleryPage() {
  const { csrfToken } = useAdminAuth();
  const { data: photos = [], isLoading, refetch } = useAdminGalleryPhotos(csrfToken);

  const uploadMutation = useUploadGalleryPhoto(csrfToken);
  const updateMutation = useUpdateGalleryPhoto(csrfToken);
  const deleteMutation = useDeleteGalleryPhoto(csrfToken);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<AdminGalleryPhoto | null>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formCategory, setFormCategory] = useState("Worship & Praise");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [formYear, setFormYear] = useState(2025);
  const [formIsVisible, setFormIsVisible] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Extract all existing categories dynamically
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    // Default baseline categories
    ["Worship & Praise", "Word & Ministry", "Fellowship & Community", "Camp Atmosphere"].forEach((c) =>
      set.add(c)
    );
    photos.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.caption && p.caption.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && p.is_visible) ||
        (visibilityFilter === "hidden" && !p.is_visible);

      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [photos, searchTerm, selectedCategory, visibilityFilter]);

  // Open upload modal
  const handleOpenUpload = () => {
    setEditingPhoto(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormTitle("");
    setFormCaption("");
    setFormCategory(existingCategories[0] || "Worship & Praise");
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setFormYear(2025);
    setFormIsVisible(true);
    setFormSortOrder(photos.length + 1);
    setIsUploadModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (photo: AdminGalleryPhoto) => {
    setEditingPhoto(photo);
    setSelectedFile(null);
    setPreviewUrl(getMediaUrl(photo.full_url || photo.thumb_url));
    setFormTitle(photo.title);
    setFormCaption(photo.caption || "");
    if (existingCategories.includes(photo.category)) {
      setFormCategory(photo.category);
      setIsCustomCategory(false);
      setCustomCategoryInput("");
    } else {
      setIsCustomCategory(true);
      setCustomCategoryInput(photo.category);
    }
    setFormYear(photo.year);
    setFormIsVisible(photo.is_visible);
    setFormSortOrder(photo.sort_order);
    setIsUploadModalOpen(true);
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large. Maximum allowed size is 15 MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-fill title if empty from clean filename
    if (!formTitle) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setFormTitle(cleanName);
    }
  };

  // Save (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : formCategory;
    if (!finalCategory) {
      alert("Please specify a tag/category.");
      return;
    }

    if (!formTitle.trim()) {
      alert("Please provide a title for the photo.");
      return;
    }

    try {
      if (editingPhoto) {
        // Updating existing photo
        await updateMutation.mutateAsync({
          id: editingPhoto.id,
          payload: {
            title: formTitle.trim(),
            caption: formCaption.trim() || undefined,
            category: finalCategory,
            year: formYear,
            is_visible: formIsVisible,
            sort_order: formSortOrder,
          },
        });
      } else {
        // Uploading new photo
        if (!selectedFile) {
          alert("Please select an image file to upload.");
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", formTitle.trim());
        if (formCaption.trim()) formData.append("caption", formCaption.trim());
        formData.append("category", finalCategory);
        formData.append("year", String(formYear));
        formData.append("is_visible", String(formIsVisible));
        formData.append("sort_order", String(formSortOrder));

        await uploadMutation.mutateAsync(formData);
      }

      await refetch();
      setIsUploadModalOpen(false);
    } catch (err: any) {
      alert(`Error saving photo: ${err.message || "Failed to save photo"}`);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (photo: AdminGalleryPhoto) => {
    try {
      await updateMutation.mutateAsync({
        id: photo.id,
        payload: { is_visible: !photo.is_visible },
      });
      await refetch();
    } catch (err: any) {
      alert(`Failed to update visibility: ${err.message}`);
    }
  };

  // Delete Photo
  const handleDelete = async (photo: AdminGalleryPhoto) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${photo.title}"?\n\nThis will remove the photo from the public site and delete its files from the server.`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(photo.id);
      await refetch();
    } catch (err: any) {
      alert(`Failed to delete photo: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto text-white">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[rgba(103,163,177,0.18)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-sans tracking-wider uppercase mb-2 bg-[rgba(103,163,177,0.15)] text-[var(--color-ice)] border border-[rgba(103,163,177,0.3)]">
            <Images size={13} />
            <span>Exhibition Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-ice)]">Gallery Photos</h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            Upload new photos, manage existing categories and tags, or hide/remove images from the public
            gallery in real-time without touching code.
          </p>
        </div>

        <button
          onClick={handleOpenUpload}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-sans font-medium text-sm text-[var(--color-primary)] bg-[var(--color-ice)] hover:bg-white transition-all duration-200 hover:scale-105 shadow-lg cursor-pointer shrink-0"
        >
          <Upload size={16} />
          <span>Upload New Photo</span>
        </button>
      </div>

      {/* ── Search, Filter & Quick Stats ─────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search by title, tag, or caption..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-[rgba(103,163,177,0.25)] text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-ice)]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0d2129] border border-[rgba(103,163,177,0.25)] text-sm text-white focus:outline-none focus:border-[var(--color-ice)] cursor-pointer"
          >
            <option value="All">All Categories ({photos.length})</option>
            {existingCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({photos.filter((p) => p.category === cat).length})
              </option>
            ))}
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl bg-[#0d2129] border border-[rgba(103,163,177,0.25)] text-sm text-white focus:outline-none focus:border-[var(--color-ice)] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="visible">Published Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs font-sans text-white/70">
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            Total: <strong className="text-white">{photos.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            Visible: <strong>{photos.filter((p) => p.is_visible).length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            Hidden: <strong>{photos.filter((p) => !p.is_visible).length}</strong>
          </span>
        </div>
      </div>

      {/* ── Photo Grid ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-white/50 font-sans text-sm">
          Loading gallery photos...
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 p-8">
          <Images size={40} className="mx-auto text-white/30 mb-3" />
          <h3 className="text-lg font-serif text-[var(--color-ice)]">No photos found</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto mt-1 mb-4">
            {searchTerm || selectedCategory !== "All" || visibilityFilter !== "all"
              ? "Try adjusting your search or filters."
              : "No photos uploaded yet. Click below to add your first photo."}
          </p>
          <button
            onClick={handleOpenUpload}
            className="px-4 py-2 rounded-xl bg-[var(--color-ice)] text-[var(--color-primary)] text-sm font-semibold hover:bg-white transition-colors"
          >
            + Upload Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`group flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
                photo.is_visible
                  ? "bg-[#0d2129]/80 border-[rgba(103,163,177,0.2)] hover:border-[rgba(216,245,249,0.4)] shadow-md"
                  : "bg-black/30 border-dashed border-white/15 opacity-60 hover:opacity-100"
              }`}
            >
              {/* Image Preview & Badge */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                <img
                  src={getMediaUrl(photo.thumb_url || photo.thumb)}
                  alt={photo.alt || photo.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Top Badges: Category & Visibility */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium backdrop-blur-md shadow"
                    style={{
                      background: "rgba(6,19,26,0.85)",
                      color: "var(--color-ice)",
                      border: "1px solid rgba(216,245,249,0.3)",
                    }}
                  >
                    <Tag size={10} className="opacity-80" />
                    {photo.category}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider backdrop-blur-md shadow ${
                      photo.is_visible
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {photo.is_visible ? "Published" : "Hidden"}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif text-base text-[var(--color-ice)] font-normal line-clamp-1">
                    {photo.title}
                  </h4>
                  {photo.caption ? (
                    <p className="font-sans text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                      {photo.caption}
                    </p>
                  ) : (
                    <p className="font-sans text-xs text-white/30 italic mt-1">No description added.</p>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-white/10">
                  {/* Visibility Toggle Button */}
                  <button
                    onClick={() => handleToggleVisibility(photo)}
                    title={photo.is_visible ? "Hide from public gallery" : "Publish to public gallery"}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                      photo.is_visible
                        ? "bg-white/5 hover:bg-amber-500/20 text-white/80 hover:text-amber-300"
                        : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {photo.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{photo.is_visible ? "Hide" : "Show"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(photo)}
                      title="Edit details & tags"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-[var(--color-ice)] transition-colors cursor-pointer"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(photo)}
                      title="Delete photo permanently"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload / Edit Modal ──────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0a1a20] border border-[rgba(103,163,177,0.3)] shadow-2xl p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-ice)]/10 text-[var(--color-ice)]">
                  {editingPhoto ? <Edit3 size={18} /> : <Upload size={18} />}
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-ice)]">
                    {editingPhoto ? "Edit Photo Details" : "Upload New Photo"}
                  </h3>
                  <p className="font-sans text-xs text-white/50">
                    {editingPhoto
                      ? "Change the category, title, description, or visibility."
                      : "File name will be automatically sanitized and converted to optimized WebP."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Image Uploader (Required for create, preview for edit) */}
              {!editingPhoto ? (
                <div>
                  <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-2">
                    Photo File <span className="text-rose-400">*</span>
                  </label>
                  <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[rgba(103,163,177,0.3)] hover:border-[var(--color-ice)] rounded-xl cursor-pointer bg-white/5 transition-colors overflow-hidden">
                    {previewUrl ? (
                      <div className="relative w-full aspect-[16/9] max-h-48 rounded-lg overflow-hidden">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-xs text-white font-sans bg-black/60 px-3 py-1.5 rounded-full">
                            Click to change photo
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload size={28} className="mx-auto text-[var(--color-ice)] opacity-80 mb-2" />
                        <p className="font-sans text-sm text-white">Click or drag & drop photo here</p>
                        <p className="font-sans text-xs text-white/40 mt-1">JPEG, PNG, or WebP up to 15 MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : previewUrl ? (
                <div>
                  <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-2">
                    Current Photo Preview
                  </label>
                  <div className="w-full aspect-[16/9] max-h-40 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <img src={previewUrl} alt={editingPhoto.title} className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : null}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-1.5">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Night of Holy Reverence"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[rgba(103,163,177,0.25)] text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-ice)]"
                />
              </div>

              {/* Tag / Category Choice */}
              <div>
                <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-1.5">
                  Tag / Category <span className="text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                      !isCustomCategory
                        ? "bg-[rgba(216,245,249,0.15)] text-[var(--color-ice)] border border-[rgba(216,245,249,0.4)]"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Select Existing Tag
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                      isCustomCategory
                        ? "bg-[rgba(216,245,249,0.15)] text-[var(--color-ice)] border border-[rgba(216,245,249,0.4)]"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    + Add New Custom Tag
                  </button>
                </div>

                {!isCustomCategory ? (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0d2129] border border-[rgba(103,163,177,0.25)] text-sm text-white focus:outline-none focus:border-[var(--color-ice)] cursor-pointer"
                  >
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Type custom tag (e.g. Prayer Rally, Choir Ministry, Games)..."
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--color-ice)] text-sm text-white placeholder-white/40 focus:outline-none"
                  />
                )}
              </div>

              {/* Caption Description */}
              <div>
                <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-1.5">
                  Description / Caption (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe this moment (visible in the fullscreen lightbox)..."
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[rgba(103,163,177,0.25)] text-sm text-white placeholder-white/40 focus:outline-none focus:border-[var(--color-ice)] resize-none"
                />
              </div>

              {/* Options: Visibility and Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsVisible}
                    onChange={(e) => setFormIsVisible(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-ice)]"
                  />
                  <div>
                    <span className="text-xs font-sans font-medium text-white block">
                      Published (Visible)
                    </span>
                    <span className="text-[11px] font-sans text-white/50 block">
                      Show in public gallery
                    </span>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-sans uppercase tracking-wider text-white/70 mb-1">
                    Camp Year
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[rgba(103,163,177,0.25)] text-sm text-white focus:outline-none focus:border-[var(--color-ice)]"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-sans text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-ice)] text-[var(--color-primary)] font-sans font-semibold text-sm hover:bg-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {uploadMutation.isPending || updateMutation.isPending
                    ? "Processing WebP..."
                    : editingPhoto
                    ? "Save Changes"
                    : "Upload & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
