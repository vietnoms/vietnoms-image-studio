"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { type Workspace } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { MaskCanvas, type MaskCanvasHandle } from "./MaskCanvas";

interface EditorViewProps {
  workspace: Workspace;
}

type EditorTool = "select" | "crop" | "text" | "erase" | "mask" | "enhance";

const TOOLS: { key: EditorTool; label: string; icon: string }[] = [
  { key: "select", label: "Select", icon: "cursor" },
  { key: "crop", label: "Crop", icon: "crop" },
  { key: "text", label: "Text", icon: "text" },
  { key: "erase", label: "Erase", icon: "eraser" },
  { key: "mask", label: "Mask", icon: "paintbrush" },
  { key: "enhance", label: "Enhance", icon: "sparkle" },
];

const TOOL_ICONS: Record<string, React.ReactNode> = {
  cursor: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
    </svg>
  ),
  crop: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5" />
    </svg>
  ),
  text: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  ),
  eraser: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83a1.125 1.125 0 0 1 1.59 0l6.375 6.375a1.125 1.125 0 0 1 0 1.59L10.83 19.17a1.125 1.125 0 0 1-1.59 0Z" />
    </svg>
  ),
  paintbrush: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
    </svg>
  ),
  sparkle: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    </svg>
  ),
};

// Quick edit presets per tool
const EDIT_PRESETS: Record<EditorTool, string[]> = {
  select: [],
  crop: [],
  text: ["Add a price tag showing $5.99", "Add 'NEW' label in the corner", "Add restaurant name watermark"],
  erase: ["Remove the background completely", "Remove all text from the image", "Remove the object in the center"],
  mask: ["Replace the painted area with a wooden table", "Remove the painted area and fill naturally", "Change the painted area to a different color"],
  enhance: ["Make the colors more vibrant", "Increase sharpness and clarity", "Apply warm restaurant lighting", "Add subtle steam or heat effect", "Make the food look more appetizing"],
};

export function EditorView({ workspace }: EditorViewProps) {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const [loadedFile, setLoadedFile] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mask state
  const maskCanvasRef = useRef<MaskCanvasHandle>(null);
  const [maskMode, setMaskMode] = useState<"paint" | "erase">("paint");
  const [brushSize, setBrushSize] = useState(30);
  const [hasMask, setHasMask] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 800 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const isMaskActive = activeTool === "mask" || activeTool === "erase";

  // Load image from ?image= query param (Gallery → Editor flow)
  useEffect(() => {
    const imageUrl = searchParams.get("image");
    if (imageUrl && !loadedImage) {
      setLoadedImage(imageUrl);
    }
  }, [searchParams, loadedImage]);

  // Track rendered image dimensions for mask canvas sizing
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadedFile(file);
    const url = URL.createObjectURL(file);
    setLoadedImage(url);
    setEditedImage(null);
    setEditHistory([]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setLoadedFile(file);
      const url = URL.createObjectURL(file);
      setLoadedImage(url);
      setEditedImage(null);
      setEditHistory([]);
      setError(null);
    }
  }, []);

  // Convert current displayed image to base64 for API
  const getImageBase64 = async (): Promise<{ data: string; mimeType: string } | null> => {
    const imageUrl = editedImage || loadedImage;
    if (!imageUrl) return null;

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      return {
        data: base64,
        mimeType: blob.type || loadedFile?.type || "image/png",
      };
    } catch {
      return null;
    }
  };

  const handleApplyEdit = async () => {
    if (!editPrompt.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const imageData = await getImageBase64();
      if (!imageData) {
        throw new Error("Failed to read image data");
      }

      // Get mask data if mask canvas has content
      const maskBase64 = hasMask ? maskCanvasRef.current?.getMaskBase64() : undefined;

      const response = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.data,
          imageMimeType: imageData.mimeType,
          instruction: editPrompt,
          workspace,
          ...(maskBase64 ? { mask: maskBase64 } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Edit failed");
      }

      // Save current image to history before replacing
      const current = editedImage || loadedImage;
      if (current) {
        setEditHistory((prev) => [...prev, current]);
      }

      setEditedImage(data.image.url);
      setEditPrompt("");
      // Clear mask after successful edit
      maskCanvasRef.current?.clear();
      setHasMask(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const prev = editHistory[editHistory.length - 1];
    setEditedImage(prev === loadedImage ? null : prev);
    setEditHistory((h) => h.slice(0, -1));
  };

  const handleReset = () => {
    setEditedImage(null);
    setEditHistory([]);
    setError(null);
  };

  const displayImage = editedImage || loadedImage;

  return (
    <div className="h-full flex">
      {/* Tool sidebar */}
      <div className="w-14 border-r border-border bg-card/30 flex flex-col items-center py-3 gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActiveTool(tool.key)}
            title={tool.label}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              activeTool === tool.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {TOOL_ICONS[tool.icon]}
          </button>
        ))}

        {/* Divider */}
        {displayImage && (
          <>
            <div className="w-6 h-px bg-border my-2" />
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={editHistory.length === 0}
              title="Undo"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
            </button>
            {/* Reset */}
            <button
              onClick={handleReset}
              disabled={!editedImage}
              title="Reset to original"
              className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        {displayImage ? (
          <>
            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center p-6 bg-background">
              <div ref={imageContainerRef} className="relative max-w-full max-h-full rounded-lg overflow-hidden border border-border shadow-lg">
                <Image
                  src={displayImage}
                  alt="Editing"
                  width={800}
                  height={800}
                  className="object-contain max-h-[60vh] w-auto"
                  unoptimized
                  onLoad={handleImageLoad}
                />
                {/* Mask canvas overlay */}
                <MaskCanvas
                  ref={maskCanvasRef}
                  imageWidth={imageDimensions.width}
                  imageHeight={imageDimensions.height}
                  brushSize={brushSize}
                  mode={activeTool === "erase" ? "paint" : maskMode}
                  visible={isMaskActive && !isProcessing}
                  onMaskChange={setHasMask}
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-xs text-muted-foreground">Applying edit with Gemini AI...</p>
                    </div>
                  </div>
                )}
                {/* Edit count badge */}
                {editHistory.length > 0 && (
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-primary/80 text-white text-[10px] font-medium">
                    {editHistory.length} edit{editHistory.length !== 1 ? "s" : ""} applied
                  </div>
                )}
                {/* Mask active indicator */}
                {hasMask && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500/80 text-white text-[10px] font-medium">
                    Mask active
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Edit prompt bar */}
            <div className="px-6 py-4 border-t border-border bg-card/30">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Describe your edit — e.g. 'Remove the background', 'Add steam effect', 'Make colors more vibrant'..."
                    className="w-full h-10 px-4 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                    onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleApplyEdit()}
                    disabled={isProcessing}
                  />
                </div>
                <button
                  onClick={handleApplyEdit}
                  disabled={!editPrompt.trim() || isProcessing}
                  className="h-10 px-5 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Editing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      Apply Edit
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setLoadedImage(null);
                    setLoadedFile(null);
                    setEditedImage(null);
                    setEditHistory([]);
                    setError(null);
                  }}
                  className="h-10 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                  New Image
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Drop zone / empty state */
          <div
            className="flex-1 flex items-center justify-center p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-6 max-w-md text-center">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center glow-md">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  AI Image Editor
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                  Upload an image to edit it with AI-powered tools. Describe changes in natural language and let Gemini apply them.
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports background removal, style transfer, object editing, and more.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-7 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] glow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Image
                </button>
                <span className="text-xs text-muted-foreground">
                  or drag and drop an image here
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Feature hints */}
              <div className="grid grid-cols-3 gap-3 mt-4 w-full max-w-sm">
                {[
                  { label: "Remove Background", icon: "🖼️" },
                  { label: "Add Text Overlay", icon: "✍️" },
                  { label: "AI Enhancement", icon: "✨" },
                ].map((feat) => (
                  <div
                    key={feat.label}
                    className="rounded-lg border border-border bg-card/50 p-3 text-center"
                  >
                    <div className="text-lg mb-1">{feat.icon}</div>
                    <p className="text-[10px] text-muted-foreground">{feat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Properties panel */}
      <div className="w-64 border-l border-border bg-card/30 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          {activeTool === "select" ? "Properties" : `${TOOLS.find(t => t.key === activeTool)?.label} Tool`}
        </h3>

        {/* Quick edit presets */}
        {EDIT_PRESETS[activeTool]?.length > 0 && displayImage && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Edits
              </label>
              <div className="space-y-1">
                {EDIT_PRESETS[activeTool].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setEditPrompt(preset)}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTool === "crop" && displayImage && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                AI Crop Presets
              </label>
              <div className="space-y-1">
                {[
                  "Crop to 1:1 square, centered on main subject",
                  "Crop to 4:5 portrait, keep full dish visible",
                  "Crop to 16:9 landscape banner",
                  "Crop to 9:16 story format",
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setEditPrompt(preset)}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mask / Erase tool properties */}
        {isMaskActive && displayImage && (
          <div className="space-y-3">
            {activeTool === "mask" && (
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Brush Mode
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMaskMode("paint")}
                    className={cn(
                      "flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      maskMode === "paint"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : "bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Paint
                  </button>
                  <button
                    onClick={() => setMaskMode("erase")}
                    className={cn(
                      "flex-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      maskMode === "erase"
                        ? "bg-white/10 text-foreground border border-white/30"
                        : "bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Erase
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Brush Size: {brushSize}px
              </label>
              <input
                type="range"
                min={5}
                max={80}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>5px</span>
                <span>80px</span>
              </div>
            </div>

            <button
              onClick={() => {
                maskCanvasRef.current?.clear();
                setHasMask(false);
              }}
              disabled={!hasMask}
              className="w-full px-3 py-2 rounded-md text-xs font-medium bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30"
            >
              Clear Mask
            </button>

            <div className="pt-2 border-t border-border">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Edits
              </label>
              <div className="space-y-1">
                {EDIT_PRESETS[activeTool].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setEditPrompt(preset)}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {activeTool === "mask"
                ? "Paint over the area you want to edit, then describe the change in the prompt bar."
                : "Paint over the area to erase, then type your erase instruction below."}
            </p>
          </div>
        )}

        {activeTool === "select" && !displayImage && (
          <p className="text-xs text-muted-foreground">
            Upload an image to start editing. Select a tool from the left toolbar, then describe your edit in the prompt bar below the image.
          </p>
        )}

        {activeTool === "select" && displayImage && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Quick Actions
              </label>
              <div className="space-y-1">
                {[
                  "Rotate 90 degrees clockwise",
                  "Flip horizontally",
                  "Flip vertically",
                  "Auto-enhance colors and contrast",
                  "Convert to black and white",
                ].map((action) => (
                  <button
                    key={action}
                    onClick={() => setEditPrompt(action)}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit history */}
            {editHistory.length > 0 && (
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  History
                </label>
                <p className="text-xs text-muted-foreground">
                  {editHistory.length} edit{editHistory.length !== 1 ? "s" : ""} applied.{" "}
                  <button
                    onClick={handleUndo}
                    className="text-primary hover:underline"
                  >
                    Undo
                  </button>
                  {" · "}
                  <button
                    onClick={handleReset}
                    className="text-primary hover:underline"
                  >
                    Reset
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
