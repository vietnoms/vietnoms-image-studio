"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { type Workspace } from "@/lib/constants";
import { type MenuItem } from "@/lib/menu-items";

interface ItemPickerProps {
  workspace: Workspace;
  selectedItems: MenuItem[];
  onSelectionChange: (items: MenuItem[]) => void;
}

export function ItemPicker({
  workspace,
  selectedItems,
  onSelectionChange,
}: ItemPickerProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch items when workspace changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/menu-items?workspace=${workspace}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setItems(data.items || []);
          onSelectionChange([]);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  // Group items by category
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const cat = item.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [items]);

  const isSelected = (id: string) =>
    selectedItems.some((i) => i.id === id);

  const toggleItem = (item: MenuItem) => {
    if (isSelected(item.id)) {
      onSelectionChange(selectedItems.filter((i) => i.id !== item.id));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground py-1">
        Loading items...
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show section if no items
  }

  const totalRefs = selectedItems.reduce(
    (sum, i) => sum + i.referenceImages.length,
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Menu Items</label>
        {selectedItems.length > 0 && (
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear ({selectedItems.length})
          </button>
        )}
      </div>

      {/* Selected items summary */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => toggleItem(item)}
            >
              {item.name}
              {item.referenceImages.length > 0 && (
                <span className="ml-1 opacity-60">
                  ({item.referenceImages.length} ref)
                </span>
              )}
              <span className="ml-1">&times;</span>
            </Badge>
          ))}
          {totalRefs > 0 && (
            <span className="text-[10px] text-muted-foreground self-center ml-1">
              {totalRefs} reference photo{totalRefs !== 1 ? "s" : ""} attached
            </span>
          )}
        </div>
      )}

      {/* Scene mode indicator */}
      {selectedItems.length >= 2 && (
        <div className="rounded-md bg-primary/10 border border-primary/20 px-2 py-1.5 text-xs text-primary">
          Scene mode: {selectedItems.length} items will be composed together
        </div>
      )}

      {/* Item grid by category */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {[...grouped.entries()].map(([category, catItems]) => (
          <div key={category}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              {category}
            </div>
            <div className="space-y-0.5">
              {catItems.map((item) => {
                const selected = isSelected(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`
                      w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-colors
                      ${
                        selected
                          ? "bg-accent border border-primary"
                          : "hover:bg-muted border border-transparent"
                      }
                    `}
                  >
                    {/* Thumbnail */}
                    <div className="w-7 h-7 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {item.referenceImages.length > 0 ? (
                        <Image
                          src={item.referenceImages[0]}
                          alt={item.name}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">
                          ?
                        </div>
                      )}
                    </div>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.price && (
                      <span className="text-muted-foreground flex-shrink-0">
                        {item.price}
                      </span>
                    )}
                    {item.referenceImages.length > 0 && (
                      <span className="text-muted-foreground flex-shrink-0">
                        {item.referenceImages.length}📷
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
