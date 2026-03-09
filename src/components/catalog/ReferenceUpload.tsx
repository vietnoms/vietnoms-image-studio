"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface ReferenceUploadProps {
  itemId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ReferenceUpload({
  itemId,
  images,
  onImagesChange,
}: ReferenceUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        for (const file of acceptedFiles) {
          formData.append("images", file);
        }

        const res = await fetch(`/api/menu-items/${itemId}/references`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        onImagesChange(data.item.referenceImages);
      } catch (err) {
        console.error("Reference upload error:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [itemId, onImagesChange]
  );

  const handleRemove = async (url: string) => {
    try {
      const res = await fetch(
        `/api/menu-items/${itemId}/references?url=${encodeURIComponent(url)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        const data = await res.json();
        onImagesChange(data.item.referenceImages);
      }
    } catch (err) {
      console.error("Reference remove error:", err);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true,
  });

  return (
    <div className="space-y-2">
      {/* Existing reference photos */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt="Reference"
                width={72}
                height={72}
                className="w-18 h-18 object-cover rounded-md border border-border"
                unoptimized
              />
              <button
                onClick={() => handleRemove(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-xs
          ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <span className="text-muted-foreground">Uploading...</span>
        ) : isDragActive ? (
          <span className="text-primary">Drop photos here</span>
        ) : (
          <span className="text-muted-foreground">
            {images.length > 0
              ? "Drop more photos or click to add"
              : "Drop reference photos here or click to upload"}
          </span>
        )}
      </div>
    </div>
  );
}
