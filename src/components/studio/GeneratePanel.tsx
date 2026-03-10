"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput } from "./PromptInput";
import { ParameterControls } from "./ParameterControls";
import { TemplateSelector } from "./TemplateSelector";
import { ItemPicker } from "./ItemPicker";
import { ResultPreview, type GeneratedImage } from "./ResultPreview";
import { BatchProgress, type BatchResult } from "./BatchProgress";
import { type AspectRatio, type Workspace, IMAGE_COST_ESTIMATE } from "@/lib/constants";
import { type Template, fillTemplate, extractVariables } from "@/lib/templates";
import { type MenuItem } from "@/lib/menu-items";
import { cn } from "@/lib/utils";

const VARIATION_HINTS = [
  "", // first variation = original prompt unchanged
  "\n\nShot from a different angle, alternative composition.",
  "\n\nOverhead view, bird's eye perspective.",
  "\n\nClose-up detail shot with shallow depth of field.",
];

interface GeneratePanelProps {
  workspace: Workspace;
  onCostUpdate: (cost: number) => void;
}

export function GeneratePanel({ workspace, onCostUpdate }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );

  // Menu item state
  const [selectedItems, setSelectedItems] = useState<MenuItem[]>([]);

  // Batch generation state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCompleted, setBatchCompleted] = useState(0);
  const batchCancelledRef = useRef(false);

  // Variation state
  const [variationCount, setVariationCount] = useState(1);

  // When a template is selected, adopt its aspect ratio and negative prompt
  const handleSelectTemplate = useCallback(
    (template: Template | null) => {
      setSelectedTemplate(template);
      setVariableValues({});
      if (template) {
        setAspectRatio(template.aspect_ratio);
        if (template.negative_prompt) {
          setNegativePrompt(template.negative_prompt);
        }
      }
    },
    []
  );

  // Clear template and items when workspace changes
  useEffect(() => {
    setSelectedTemplate(null);
    setVariableValues({});
    setSelectedItems([]);
  }, [workspace]);

  const handleVariableChange = useCallback(
    (name: string, value: string) => {
      setVariableValues((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  // Build the final prompt from template + variables + items + free text
  const buildFinalPrompt = (): string => {
    let base = "";

    if (selectedTemplate) {
      // Auto-fill template variables from selected items if a single item
      const mergedVars = { ...variableValues };
      if (selectedItems.length === 1) {
        const item = selectedItems[0];
        const vars = extractVariables(selectedTemplate.prompt_text);
        for (const v of vars) {
          if (!mergedVars[v]?.trim()) {
            // Auto-fill common variable patterns from item data
            const lower = v.toLowerCase();
            if (
              lower.includes("name") ||
              lower.includes("item") ||
              lower.includes("dish") ||
              lower.includes("beverage") ||
              lower.includes("product") ||
              lower.includes("food")
            ) {
              mergedVars[v] = item.name;
            }
          }
        }
      }
      base = fillTemplate(selectedTemplate.prompt_text, mergedVars);
    }

    // Scene mode: compose prompt listing all selected items
    if (selectedItems.length >= 2) {
      const itemNames = selectedItems.map((i) => i.name).join(", ");
      const sceneDesc = `A composed scene featuring ${selectedItems.length} items: ${itemNames}.`;
      base = base ? `${base}\n\n${sceneDesc}` : sceneDesc;
    }

    // Append any additional instructions from the free-text prompt
    const extra = prompt.trim();
    if (extra) {
      base = base ? `${base}\n\n${extra}` : extra;
    }

    return base;
  };

  // Check if we can generate (template vars filled, items selected, or free-text prompt)
  const canGenerate = (): boolean => {
    if (isGenerating) return false;
    // Items selected = can always generate (scene mode or item-based)
    if (selectedItems.length > 0) return true;
    if (selectedTemplate) {
      const vars = extractVariables(selectedTemplate.prompt_text);
      const hasVars = vars.some((v) => variableValues[v]?.trim());
      return hasVars || !!prompt.trim();
    }
    return !!prompt.trim();
  };

  // Collect all reference images from selected items as base64
  const collectReferenceImages = async (): Promise<
    { data: string; mimeType: string }[]
  > => {
    const refs: { data: string; mimeType: string }[] = [];
    for (const item of selectedItems) {
      for (const url of item.referenceImages) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          refs.push({ data: base64, mimeType: blob.type || "image/jpeg" });
        } catch {
          // Skip failed fetches
        }
        // Gemini limit ~14 reference images
        if (refs.length >= 12) break;
      }
      if (refs.length >= 12) break;
    }
    return refs;
  };

  // Helper to update an image in both current and recent state
  const updateImage = (id: string, updates: Partial<GeneratedImage>) => {
    setCurrentImage((prev) =>
      prev?.id === id ? { ...prev, ...updates } : prev
    );
    setRecentImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  };

  const handleGenerate = async () => {
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Collect reference images from selected menu items
      const referenceImages = await collectReferenceImages();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          negativePrompt: negativePrompt.trim() || undefined,
          aspectRatio,
          workspace,
          templateId: selectedTemplate?.id,
          referenceImages:
            referenceImages.length > 0 ? referenceImages : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const newImage: GeneratedImage = {
        id: data.image.id,
        url: data.image.url,
        prompt: finalPrompt,
        aspectRatio,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      setCurrentImage(newImage);
      setRecentImages((prev) => [newImage, ...prev].slice(0, 20));

      if (data.image.costEstimate) {
        onCostUpdate(data.image.costEstimate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (image: GeneratedImage) => {
    setIsUploading(true);
    setError(null);

    try {
      const category =
        selectedTemplate?.category ||
        (selectedItems.length > 0 ? selectedItems[0].category : undefined);
      const itemName = selectedItems.length > 0 ? selectedItems[0].name : undefined;
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: image.url,
          workspace,
          category,
          tags: [],
          itemName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Approval failed");
      }

      updateImage(image.id, {
        status: "approved",
        driveLink: data.driveUpload?.webViewLink ?? null,
      });

      const warnings: string[] = [];
      if (data.driveError) warnings.push(`Drive: ${data.driveError}`);
      if (data.websiteError) warnings.push(`Website: ${data.websiteError}`);
      if (warnings.length > 0) {
        setError(`Approved, but: ${warnings.join("; ")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReject = (image: GeneratedImage) => {
    updateImage(image.id, { status: "rejected" });
  };

  const handleFavorite = (image: GeneratedImage) => {
    updateImage(image.id, { isFavorite: !image.isFavorite });
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = image.url;
    link.download = `image-studio-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build prompt for a single item using selected template
  const buildPromptForItem = (item: MenuItem): string => {
    let base = "";
    if (selectedTemplate) {
      const mergedVars: Record<string, string> = { ...variableValues };
      const vars = extractVariables(selectedTemplate.prompt_text);
      for (const v of vars) {
        if (!mergedVars[v]?.trim()) {
          const lower = v.toLowerCase();
          if (
            lower.includes("name") ||
            lower.includes("item") ||
            lower.includes("dish") ||
            lower.includes("beverage") ||
            lower.includes("product") ||
            lower.includes("food")
          ) {
            mergedVars[v] = item.name;
          }
          if (lower.includes("description") || lower.includes("desc")) {
            mergedVars[v] = item.description || item.name;
          }
          if (lower.includes("price")) {
            mergedVars[v] = item.price || "";
          }
          if (lower.includes("category") || lower.includes("type")) {
            mergedVars[v] = item.category || "";
          }
        }
      }
      base = fillTemplate(selectedTemplate.prompt_text, mergedVars);
    } else {
      base = item.name;
    }

    const extra = prompt.trim();
    if (extra) {
      base = base ? `${base}\n\n${extra}` : extra;
    }
    return base;
  };

  // Collect reference images for a single item
  const collectItemReferenceImages = async (
    item: MenuItem
  ): Promise<{ data: string; mimeType: string }[]> => {
    const refs: { data: string; mimeType: string }[] = [];
    for (const url of item.referenceImages) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        refs.push({ data: base64, mimeType: blob.type || "image/jpeg" });
      } catch {
        // Skip
      }
      if (refs.length >= 12) break;
    }
    return refs;
  };

  const handleBatchGenerate = async () => {
    if (!selectedTemplate || selectedItems.length < 2) return;

    batchCancelledRef.current = false;
    setIsBatchRunning(true);
    setBatchTotal(selectedItems.length);
    setBatchCompleted(0);
    setError(null);

    // Initialize results
    const initialResults: BatchResult[] = selectedItems.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      status: "pending" as const,
    }));
    setBatchResults(initialResults);

    let completedCount = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      if (batchCancelledRef.current) break;

      const item = selectedItems[i];

      // Mark current item as generating
      setBatchResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: "generating" as const } : r
        )
      );

      try {
        const itemPrompt = buildPromptForItem(item);
        const referenceImages = await collectItemReferenceImages(item);

        if (batchCancelledRef.current) break;

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: itemPrompt,
            negativePrompt: negativePrompt.trim() || undefined,
            aspectRatio,
            workspace,
            templateId: selectedTemplate.id,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Generation failed");
        }

        const newImage: GeneratedImage = {
          id: data.image.id,
          url: data.image.url,
          prompt: itemPrompt,
          aspectRatio,
          createdAt: new Date().toISOString(),
          status: "pending",
        };

        completedCount++;
        setBatchCompleted(completedCount);
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "done" as const, image: newImage } : r
          )
        );

        // Add to recent images
        setRecentImages((prev) => [newImage, ...prev].slice(0, 20));

        if (data.image.costEstimate) {
          onCostUpdate(data.image.costEstimate);
        }
      } catch (err) {
        completedCount++;
        setBatchCompleted(completedCount);
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Failed",
                }
              : r
          )
        );
      }
    }

    // Mark any remaining pending items as cancelled if we stopped early
    if (batchCancelledRef.current) {
      setBatchResults((prev) =>
        prev.map((r) =>
          r.status === "pending"
            ? { ...r, status: "error" as const, error: "Cancelled" }
            : r
        )
      );
      setBatchCompleted(selectedItems.length);
    }

    setIsBatchRunning(false);
  };

  // Generate N variations of the same prompt with composition hints
  const handleGenerateVariations = async () => {
    const basePrompt = buildFinalPrompt();
    if (!basePrompt) return;

    batchCancelledRef.current = false;
    setIsBatchRunning(true);
    setBatchTotal(variationCount);
    setBatchCompleted(0);
    setError(null);

    const initialResults: BatchResult[] = Array.from(
      { length: variationCount },
      (_, i) => ({
        itemId: `variation-${i + 1}`,
        itemName: `Variation ${i + 1}`,
        status: "pending" as const,
      })
    );
    setBatchResults(initialResults);

    // Collect reference images once for all variations
    const referenceImages = await collectReferenceImages();
    let completedCount = 0;

    for (let i = 0; i < variationCount; i++) {
      if (batchCancelledRef.current) break;

      setBatchResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, status: "generating" as const } : r
        )
      );

      try {
        const varPrompt = basePrompt + VARIATION_HINTS[i];

        if (batchCancelledRef.current) break;

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: varPrompt,
            negativePrompt: negativePrompt.trim() || undefined,
            aspectRatio,
            workspace,
            templateId: selectedTemplate?.id,
            referenceImages:
              referenceImages.length > 0 ? referenceImages : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Generation failed");
        }

        const newImage: GeneratedImage = {
          id: data.image.id,
          url: data.image.url,
          prompt: varPrompt,
          aspectRatio,
          createdAt: new Date().toISOString(),
          status: "pending",
        };

        completedCount++;
        setBatchCompleted(completedCount);
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "done" as const, image: newImage } : r
          )
        );

        setRecentImages((prev) => [newImage, ...prev].slice(0, 20));

        if (data.image.costEstimate) {
          onCostUpdate(data.image.costEstimate);
        }
      } catch (err) {
        completedCount++;
        setBatchCompleted(completedCount);
        setBatchResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Failed",
                }
              : r
          )
        );
      }
    }

    if (batchCancelledRef.current) {
      setBatchResults((prev) =>
        prev.map((r) =>
          r.status === "pending"
            ? { ...r, status: "error" as const, error: "Cancelled" }
            : r
        )
      );
      setBatchCompleted(variationCount);
    }

    setIsBatchRunning(false);
  };

  const handleBatchCancel = () => {
    batchCancelledRef.current = true;
  };

  const handleBatchDone = () => {
    // Show first successful result as current image
    const firstSuccess = batchResults.find((r) => r.status === "done" && r.image);
    if (firstSuccess?.image) {
      setCurrentImage(firstSuccess.image);
    }
    setBatchResults([]);
    setBatchTotal(0);
    setBatchCompleted(0);
  };

  const canBatchGenerate =
    isBatchMode &&
    selectedTemplate != null &&
    selectedItems.length >= 2 &&
    !isBatchRunning &&
    !isGenerating;

  const batchCostEstimate = selectedItems.length * IMAGE_COST_ESTIMATE.generation;

  return (
    <div className="flex h-full">
      {/* Left panel — Controls */}
      <div className="w-[380px] border-r border-border p-4 space-y-4 overflow-y-auto">
        {/* Template selector */}
        <div className="space-y-2">
          <TemplateSelector
            workspace={workspace}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>

        {/* Menu item picker */}
        {workspace !== "general" && (
          <div className="space-y-2">
            <ItemPicker
              workspace={workspace}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          </div>
        )}

        {/* Prompt input with template variable fields */}
        <PromptInput
          prompt={prompt}
          negativePrompt={negativePrompt}
          onPromptChange={setPrompt}
          onNegativePromptChange={setNegativePrompt}
          showNegative={showNegative}
          onToggleNegative={() => setShowNegative(!showNegative)}
          selectedTemplate={selectedTemplate}
          variableValues={variableValues}
          onVariableChange={handleVariableChange}
          selectedItems={selectedItems}
        />

        {/* Aspect ratio */}
        <ParameterControls
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
        />

        {/* Variation count (hidden in batch mode) */}
        {!isBatchMode && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Variations
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setVariationCount(n)}
                  className={cn(
                    "flex-1 h-8 rounded-lg border text-sm font-medium transition-colors",
                    variationCount === n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variation cost estimate */}
        {!isBatchMode && variationCount > 1 && (
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{variationCount} variations</span>
            {" × $"}{IMAGE_COST_ESTIMATE.generation.toFixed(2)}
            {" = "}
            <span className="text-primary font-medium">${(variationCount * IMAGE_COST_ESTIMATE.generation).toFixed(2)}</span>
            {" estimated"}
          </div>
        )}

        {/* Batch mode toggle */}
        {workspace !== "general" && selectedItems.length >= 2 && selectedTemplate && (
          <div className="flex items-center justify-between py-1">
            <label className="text-xs text-muted-foreground">Batch Mode</label>
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors",
                isBatchMode ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  isBatchMode ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        )}

        {/* Batch cost estimate */}
        {isBatchMode && selectedItems.length >= 2 && (
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{selectedItems.length} items</span>
            {" × $"}{IMAGE_COST_ESTIMATE.generation.toFixed(2)}
            {" = "}
            <span className="text-primary font-medium">${batchCostEstimate.toFixed(2)}</span>
            {" estimated"}
          </div>
        )}

        {/* Generate / Batch Generate button */}
        <div className="space-y-2 pt-1">
          {isBatchMode ? (
            <button
              onClick={handleBatchGenerate}
              disabled={!canBatchGenerate}
              className="w-full h-10 rounded-lg text-sm font-medium text-white transition-all duration-200 gradient-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 glow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-1.243 1.007-2.25 2.25-2.25h13.5" />
              </svg>
              Generate All ({selectedItems.length})
            </button>
          ) : (
            <button
              onClick={variationCount > 1 ? handleGenerateVariations : handleGenerate}
              disabled={!canGenerate()}
              className="w-full h-10 rounded-lg text-sm font-medium text-white transition-all duration-200 gradient-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 glow-sm flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  {variationCount > 1 ? `Generate ${variationCount} Variations` : "Generate"}
                </>
              )}
            </button>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Right panel — Preview or Batch Progress */}
      <div className="flex-1 bg-background">
        {batchResults.length > 0 ? (
          <BatchProgress
            total={batchTotal}
            completed={batchCompleted}
            results={batchResults}
            onCancel={handleBatchCancel}
            onDone={handleBatchDone}
            isDone={!isBatchRunning && batchCompleted === batchTotal}
          />
        ) : (
          <ResultPreview
            currentImage={currentImage}
            recentImages={recentImages}
            isGenerating={isGenerating}
            isUploading={isUploading}
            onSelectImage={setCurrentImage}
            onApprove={handleApprove}
            onReject={handleReject}
            onFavorite={handleFavorite}
            onDownload={handleDownload}
          />
        )}
      </div>
    </div>
  );
}
