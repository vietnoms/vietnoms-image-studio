"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { type Workspace } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  workspace: Workspace;
  status: "pending" | "approved" | "rejected" | "archived";
  isFavorite: boolean;
  createdAt: string;
  driveLink?: string | null;
  model?: string;
  costEstimate?: number;
  tags: string[];
}

type FilterStatus =
  | "all"
  | "approved"
  | "pending"
  | "rejected"
  | "archived"
  | "favorites";

interface GalleryViewProps {
  workspace: Workspace;
}

export function GalleryView({ workspace }: GalleryViewProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tags
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Fetch images from API
  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ workspace });
      if (filter !== "all") params.set("status", filter);
      if (search.trim()) params.set("search", search);
      if (tagFilter) params.set("tag", tagFilter);

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();
      setImages(data.images || []);
      setTotal(data.total || 0);
    } catch {
      setImages([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [workspace, filter, search, tagFilter]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`/api/tags?workspace=${workspace}`);
      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch {
      setAvailableTags([]);
    }
  }, [workspace]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Clear tag filter if the tag no longer exists
  useEffect(() => {
    if (tagFilter && !availableTags.includes(tagFilter)) {
      setTagFilter(null);
    }
  }, [availableTags, tagFilter]);

  // Clear selection when workspace/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [workspace, filter]);

  // Toggle favorite
  const toggleFavorite = async (img: GalleryImage) => {
    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, isFavorite: !img.isFavorite }),
      });
      setImages((prev) =>
        prev.map((i) =>
          i.id === img.id ? { ...i, isFavorite: !i.isFavorite } : i
        )
      );
      if (selectedImage?.id === img.id) {
        setSelectedImage({ ...img, isFavorite: !img.isFavorite });
      }
    } catch {
      // Silently fail
    }
  };

  // Update status
  const updateStatus = async (
    img: GalleryImage,
    status: GalleryImage["status"]
  ) => {
    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, status }),
      });
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, status } : i))
      );
      if (selectedImage?.id === img.id) {
        setSelectedImage({ ...img, status });
      }
    } catch {
      // Silently fail
    }
  };

  // ── Selection helpers ──────────────────────────────────────────────────
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const bulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch("/api/images/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], action }),
      });
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      fetchImages();
    } catch {
      // Silently fail
    }
  };

  // ── Tag helpers ────────────────────────────────────────────────────────
  const addTag = async (img: GalleryImage) => {
    const tag = newTagInput.trim().toLowerCase();
    if (!tag || img.tags.includes(tag)) return;

    const newTags = [...img.tags, tag];
    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, tags: newTags }),
      });
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, tags: newTags } : i))
      );
      setSelectedImage({ ...img, tags: newTags });
      setNewTagInput("");
      fetchTags();
    } catch {
      // Silently fail
    }
  };

  const removeTag = async (img: GalleryImage, tagToRemove: string) => {
    const newTags = img.tags.filter((t) => t !== tagToRemove);
    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: img.id, tags: newTags }),
      });
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, tags: newTags } : i))
      );
      setSelectedImage({ ...img, tags: newTags });
      fetchTags();
    } catch {
      // Silently fail
    }
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "pending", label: "Pending" },
    { key: "rejected", label: "Rejected" },
    { key: "archived", label: "Archived" },
    { key: "favorites", label: "Favorites" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Gallery</h2>
          <span className="text-xs text-muted-foreground">
            {total} image{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="h-8 w-52 pl-8 pr-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Tag filter */}
          {availableTags.length > 0 && (
            <select
              value={tagFilter || ""}
              onChange={(e) => setTagFilter(e.target.value || null)}
              className="h-8 px-2 rounded-lg bg-muted/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          {/* Select mode toggle */}
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isSelectionMode
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {isSelectionMode ? "Cancel" : "Select"}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchImages}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Refresh"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("masonry")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "masonry"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v13.5a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-6 py-2 border-b border-border flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all duration-150",
              filter === f.key
                ? "gradient-primary text-white"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 border-b border-border bg-primary/5 flex items-center gap-3">
          <span className="text-xs font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => bulkAction("approve")}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => bulkAction("reject")}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => bulkAction("archive")}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Archive
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={selectAllVisible}
              className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Gallery content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-md">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                No images yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Generated images from the Studio will appear here. Head to the
                Studio to create your first image.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Image grid */}
            <div
              className={cn(
                "flex-1",
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
              )}
            >
              {images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(img.id);
                    } else {
                      setSelectedImage(img);
                    }
                  }}
                  className={cn(
                    "group relative rounded-xl border overflow-hidden bg-card/50 transition-all cursor-pointer",
                    selectedImage?.id === img.id && !isSelectionMode
                      ? "border-primary ring-1 ring-primary/30"
                      : selectedIds.has(img.id)
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-border hover:border-primary/30"
                  )}
                >
                  {/* Selection checkbox */}
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          selectedIds.has(img.id)
                            ? "bg-primary border-primary"
                            : "border-white/60 bg-black/30"
                        )}
                      >
                        {selectedIds.has(img.id) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  <Image
                    src={img.url}
                    alt={img.prompt}
                    width={400}
                    height={400}
                    className="w-full object-cover"
                    unoptimized
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2 mb-2">
                        {img.prompt}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            img.status === "approved" &&
                              "bg-green-500/20 text-green-400",
                            img.status === "rejected" &&
                              "bg-red-500/20 text-red-400",
                            img.status === "pending" &&
                              "bg-yellow-500/20 text-yellow-400",
                            img.status === "archived" &&
                              "bg-gray-500/20 text-gray-400"
                          )}
                        >
                          {img.status}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {img.aspectRatio}
                        </span>
                        {img.tags.length > 0 && (
                          <span className="text-[10px] text-primary/80">
                            {img.tags.length} tag
                            {img.tags.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Status dot */}
                  <div className="absolute top-2 right-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        img.status === "approved" && "bg-green-500",
                        img.status === "rejected" && "bg-red-500",
                        img.status === "pending" && "bg-yellow-500",
                        img.status === "archived" && "bg-gray-500"
                      )}
                    />
                  </div>
                  {/* Favorite star */}
                  {img.isFavorite && !isSelectionMode && (
                    <div className="absolute top-2 left-2">
                      <svg
                        className="w-4 h-4 text-yellow-500 fill-yellow-500"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Detail panel */}
            {selectedImage && !isSelectionMode && (
              <div className="w-72 border border-border rounded-xl bg-card/50 p-4 space-y-4 flex-shrink-0 h-fit sticky top-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Details
                  </span>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <Image
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  width={300}
                  height={300}
                  className="w-full rounded-lg object-contain"
                  unoptimized
                />
                <div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-4">
                    {selectedImage.prompt}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        selectedImage.status === "approved" &&
                          "bg-green-500/20 text-green-400",
                        selectedImage.status === "rejected" &&
                          "bg-red-500/20 text-red-400",
                        selectedImage.status === "pending" &&
                          "bg-yellow-500/20 text-yellow-400",
                        selectedImage.status === "archived" &&
                          "bg-gray-500/20 text-gray-400"
                      )}
                    >
                      {selectedImage.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedImage.aspectRatio}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selectedImage.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </p>
                  {selectedImage.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedImage.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(selectedImage, tag)}
                            className="ml-0.5 hover:text-red-400 transition-colors"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTag(selectedImage);
                      }}
                      placeholder="Add tag..."
                      className="flex-1 h-6 px-2 rounded bg-muted/50 border border-border text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    />
                    <button
                      onClick={() => addTag(selectedImage)}
                      className="h-6 w-6 rounded bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Generation Details */}
                {(selectedImage.model || selectedImage.costEstimate) && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Generation Details
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                      {selectedImage.model && (
                        <span>Model: <span className="text-foreground">{selectedImage.model.replace("models/", "")}</span></span>
                      )}
                      {selectedImage.costEstimate != null && selectedImage.costEstimate > 0 && (
                        <span>Cost: <span className="text-foreground">${selectedImage.costEstimate.toFixed(4)}</span></span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => toggleFavorite(selectedImage)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      selectedImage.isFavorite
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {selectedImage.isFavorite ? "★ Favorited" : "☆ Favorite"}
                  </button>
                  {selectedImage.status !== "approved" && (
                    <button
                      onClick={() => updateStatus(selectedImage, "approved")}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {selectedImage.status !== "rejected" && (
                    <button
                      onClick={() => updateStatus(selectedImage, "rejected")}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Reject
                    </button>
                  )}
                  {selectedImage.status !== "archived" && (
                    <button
                      onClick={() => updateStatus(selectedImage, "archived")}
                      className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Archive
                    </button>
                  )}
                  <a
                    href={selectedImage.url}
                    download={`image-${selectedImage.id}.png`}
                    className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
