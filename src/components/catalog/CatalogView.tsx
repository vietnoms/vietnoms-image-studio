"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MenuItemCard } from "./MenuItemCard";
import { ImportDialog } from "./ImportDialog";
import { type MenuItem } from "@/lib/menu-items";
import { type Workspace } from "@/lib/constants";

interface CatalogViewProps {
  workspace: Workspace;
}

export function CatalogView({ workspace }: CatalogViewProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/menu-items?workspace=${workspace}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchItems();
    setActiveCategory(null);
    setSearch("");
  }, [fetchItems]);

  const handleUpdate = async (
    id: string,
    data: Partial<MenuItem>
  ) => {
    // If it's a referenceImages-only update (from ReferenceUpload), just update local state
    if ("referenceImages" in data && Object.keys(data).length === 1) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data } : item))
      );
      return;
    }

    try {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setItems((prev) =>
          prev.map((item) => (item.id === id ? result.item : item))
        );
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // Silently fail
    }
  };

  // Derive categories
  const categories = [
    ...new Set(items.map((i) => i.category)),
  ].sort();

  // Filter items
  const filtered = items.filter((item) => {
    if (activeCategory && item.category !== activeCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s) ||
        item.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Group by category
  const grouped = new Map<string, MenuItem[]>();
  for (const item of filtered) {
    const cat = item.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="border-b border-border p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="flex-1 md:max-w-xs h-9 md:h-8 rounded-lg bg-muted/50 border-border text-sm"
          />
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setImportOpen(true)}
            className="h-9 md:h-8 px-4 rounded-lg text-xs font-medium text-white gradient-primary hover:opacity-90 transition-all flex-shrink-0"
          >
            Import
          </button>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="border-b border-border px-4 py-2 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs transition-all ${
              !activeCategory
                ? "gradient-primary text-white font-medium"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                activeCategory === cat
                  ? "gradient-primary text-white font-medium"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {cat}
              <span className="ml-1 opacity-60">
                {items.filter((i) => i.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading items...
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {/* Gradient icon */}
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-5 glow-md">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-1">No menu items yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
              Import items from a menu board photo, CSV file, or add them manually to start generating images.
            </p>
            <button
              onClick={() => setImportOpen(true)}
              className="h-9 px-5 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] glow-sm"
            >
              Import Items
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No items match your search.
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([category, catItems]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {catItems.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspace={workspace}
        onImportComplete={fetchItems}
      />
    </div>
  );
}
