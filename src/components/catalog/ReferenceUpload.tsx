"use client";

import { useCallback, useState, useRef } from "react";
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        for (const file of files) {
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => uploadFiles(acceptedFiles),
    [uploadFiles]
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFiles(Array.from(files));
      }
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [uploadFiles]
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
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload actions */}
      <div className="flex gap-2">
        {/* Drop zone / tap to upload */}
        <div
          {...getRootProps()}
          className={`
            flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-xs
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </div>
          ) : isDragActive ? (
            <span className="text-primary">Drop photos here</span>
          ) : (
            <div className="text-muted-foreground">
              <svg className="w-5 h-5 mx-auto mb-1 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <span className="hidden md:inline">
                {images.length > 0
                  ? "Drop more photos or click to add"
                  : "Drop reference photos here or click to upload"}
              </span>
              <span className="md:hidden">
                Tap to choose photos
              </span>
            </div>
          )}
        </div>

        {/* Camera button for mobile */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
          className="md:hidden flex-shrink-0 w-14 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <span className="text-[9px]">Camera</span>
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />
      </div>
    </div>
  );
}
