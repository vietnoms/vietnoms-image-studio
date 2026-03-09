"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  createdAt: string;
  status?: "pending" | "approved" | "rejected";
  isFavorite?: boolean;
  driveLink?: string | null;
}

interface ResultPreviewProps {
  currentImage: GeneratedImage | null;
  recentImages: GeneratedImage[];
  isGenerating: boolean;
  isUploading: boolean;
  onSelectImage: (image: GeneratedImage) => void;
  onApprove: (image: GeneratedImage) => void;
  onReject: (image: GeneratedImage) => void;
  onFavorite: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
}

export function ResultPreview({
  currentImage,
  recentImages,
  isGenerating,
  isUploading,
  onSelectImage,
  onApprove,
  onReject,
  onFavorite,
  onDownload,
}: ResultPreviewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Main preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm">Generating image...</p>
          </div>
        ) : currentImage ? (
          <div className="relative max-w-full max-h-[500px] rounded-lg overflow-hidden border border-border">
            <Image
              src={currentImage.url}
              alt={currentImage.prompt}
              width={800}
              height={800}
              className="object-contain max-h-[500px] w-auto"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground/60">No image yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enter a prompt and click Generate</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {currentImage && !isGenerating && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Approve */}
          <Button
            size="sm"
            variant={currentImage.status === "approved" ? "default" : "outline"}
            className={cn(
              "text-xs",
              currentImage.status === "approved" && "bg-green-600 hover:bg-green-700 text-white"
            )}
            disabled={isUploading || currentImage.status === "approved"}
            onClick={() => onApprove(currentImage)}
          >
            {isUploading ? (
              <>
                <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </>
            ) : currentImage.status === "approved" ? (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Approved
              </>
            ) : (
              "Approve"
            )}
          </Button>

          {/* Drive link */}
          {currentImage.driveLink && (
            <a
              href={currentImage.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Open in Google Drive"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm-.71 1h2.83l-5.9 9.68L5.5 17H3.67l-1.42-2.33L7 4.5zm1.42 0h8.56l5.9 9.68-1.42 2.32H9.29l-5.9-9.68L8.42 4.5zM9.29 15h5.42l-2.71 4.5L9.29 15z" />
              </svg>
              Drive
            </a>
          )}

          {/* Reject */}
          <Button
            size="sm"
            variant={currentImage.status === "rejected" ? "default" : "outline"}
            className={cn(
              "text-xs",
              currentImage.status === "rejected" && "bg-destructive hover:bg-destructive/90 text-white"
            )}
            disabled={isUploading || currentImage.status === "rejected"}
            onClick={() => onReject(currentImage)}
          >
            {currentImage.status === "rejected" ? "Rejected" : "Reject"}
          </Button>

          {/* Favorite */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onFavorite(currentImage)}
          >
            {currentImage.isFavorite ? (
              <svg className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            )}
            Favorite
          </Button>

          {/* Download */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onDownload(currentImage)}
          >
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </Button>
        </div>
      )}

      {/* Recent generations strip */}
      {recentImages.length > 0 && (
        <div className="border-t border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Recent Generations</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentImages.map((img) => (
              <button
                key={img.id}
                onClick={() => onSelectImage(img)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors relative",
                  currentImage?.id === img.id ? "border-primary" : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Image
                  src={img.url}
                  alt=""
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
                {/* Status indicator dot */}
                {img.status === "approved" && (
                  <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black/30" />
                )}
                {img.status === "rejected" && (
                  <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-black/30" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
