"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReferenceUpload } from "./ReferenceUpload";
import { type MenuItem } from "@/lib/menu-items";

interface MenuItemCardProps {
  item: MenuItem;
  onUpdate: (id: string, data: Partial<MenuItem>) => void;
  onDelete: (id: string) => void;
}

export function MenuItemCard({ item, onUpdate, onDelete }: MenuItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editDescription, setEditDescription] = useState(item.description);
  const [editPrice, setEditPrice] = useState(item.price);
  const [editCategory, setEditCategory] = useState(item.category);

  const handleSave = () => {
    onUpdate(item.id, {
      name: editName,
      description: editDescription,
      price: editPrice,
      category: editCategory,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditDescription(item.description);
    setEditPrice(item.price);
    setEditCategory(item.category);
    setIsEditing(false);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden transition-colors hover:border-muted-foreground/30">
      {/* Compact card header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.referenceImages.length > 0 ? (
            <Image
              src={item.referenceImages[0]}
              alt={item.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <svg
              className="w-5 h-5 text-muted-foreground"
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
          )}
        </div>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{item.name}</span>
            {item.price && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {item.price}
              </span>
            )}
          </div>
          {item.description && (
            <div className="text-xs text-muted-foreground truncate">
              {item.description}
            </div>
          )}
        </div>

        {/* Badges - hidden on small screens to save space */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {item.category}
          </Badge>
          {item.referenceImages.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {item.referenceImages.length} photo
              {item.referenceImages.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-3">
          {isEditing ? (
            /* Edit form */
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <Input
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Description
                </label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Category
                </label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                Delete
              </Button>
            </div>
          )}

          {/* Reference photos */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              Reference Photos
            </label>
            <ReferenceUpload
              itemId={item.id}
              images={item.referenceImages}
              onImagesChange={(images) =>
                onUpdate(item.id, { referenceImages: images } as Partial<MenuItem>)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
