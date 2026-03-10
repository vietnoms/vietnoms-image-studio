"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  type Workspace,
  WORKSPACES,
  ASPECT_RATIOS,
  type AspectRatio,
} from "@/lib/constants";
import { type Template, extractVariables, variableToLabel } from "@/lib/templates";
import { type AnalyzedTemplate } from "@/lib/template-analyze";
import { cn } from "@/lib/utils";

interface TemplateBuilderViewProps {
  workspace: Workspace;
}

type BuilderStep = "upload" | "analyzing" | "preview" | "saved";

export function TemplateBuilderView({ workspace }: TemplateBuilderViewProps) {
  const [step, setStep] = useState<BuilderStep>("upload");
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzedTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formNegative, setFormNegative] = useState("");
  const [formAspect, setFormAspect] = useState<AspectRatio>("1:1");
  const [formStylePreset, setFormStylePreset] = useState("");
  const [formIsPremium, setFormIsPremium] = useState(false);
  const [formWorkspace, setFormWorkspace] = useState<Workspace>(workspace);

  const [isSaving, setIsSaving] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState<Template | null>(null);

  // Extract variables from prompt for live preview
  const promptVariables = extractVariables(formPrompt);

  const handleUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Create a local preview
      const reader = new FileReader();
      reader.onload = () => setPreviewFile(reader.result as string);
      reader.readAsDataURL(file);

      setStep("analyzing");
      setError(null);

      try {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("workspace", workspace);

        const res = await fetch("/api/templates/analyze", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Analysis failed");
        }

        // Populate form from AI analysis
        const tpl = data.template as AnalyzedTemplate;
        setAnalysis(tpl);
        setSourceImageUrl(data.source_image_url);
        setFormName(tpl.name);
        setFormCategory(tpl.category);
        setFormPrompt(tpl.prompt_text);
        setFormNegative(tpl.negative_prompt);
        setFormAspect(tpl.aspect_ratio);
        setFormStylePreset(tpl.style_preset);
        setFormWorkspace(workspace);
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
        setStep("upload");
      }
    },
    [workspace]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSave = async () => {
    if (!formName.trim() || !formPrompt.trim()) {
      setError("Name and prompt are required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: formWorkspace,
          name: formName,
          category: formCategory || "Uncategorized",
          prompt_text: formPrompt,
          negative_prompt: formNegative,
          aspect_ratio: formAspect,
          style_preset: formStylePreset,
          is_premium: formIsPremium,
          source_image_url: sourceImageUrl || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save template");
      }

      setSavedTemplate(data.template);
      setStep("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setSourceImageUrl(null);
    setPreviewFile(null);
    setAnalysis(null);
    setError(null);
    setFormName("");
    setFormCategory("");
    setFormPrompt("");
    setFormNegative("");
    setFormAspect("1:1");
    setFormStylePreset("");
    setFormIsPremium(false);
    setSavedTemplate(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Template Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a screenshot of a restaurant post and AI will analyze it to
            create a reusable template.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {(["upload", "analyzing", "preview", "saved"] as BuilderStep[]).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={cn(
                      "w-8 h-px",
                      step === s || (i === 1 && step === "analyzing")
                        ? "bg-primary"
                        : "bg-border"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "px-2.5 py-1 rounded-full font-medium capitalize transition-colors",
                    step === s
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {s === "analyzing" ? "Analyze" : s}
                </div>
              </div>
            )
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30 hover:bg-accent/30"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDragActive
                    ? "Drop screenshot here"
                    : "Drop a restaurant post screenshot"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, or WebP — up to 10MB
                </p>
              </div>
              <button className="px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                Browse Files
              </button>
            </div>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-6 py-12">
            {previewFile && (
              <img
                src={previewFile}
                alt="Uploaded screenshot"
                className="w-48 h-48 rounded-xl object-cover border border-border"
              />
            )}
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 animate-spin text-primary"
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
              <p className="text-sm text-muted-foreground">
                Analyzing visual style, composition, and layout...
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview / Edit */}
        {step === "preview" && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column — Screenshot + Analysis */}
            <div className="lg:col-span-2 space-y-4">
              {/* Screenshot */}
              {previewFile && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <img
                    src={previewFile}
                    alt="Source screenshot"
                    className="w-full object-contain max-h-64"
                  />
                </div>
              )}

              {/* AI Analysis Summary */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Analysis
                </h3>

                {analysis.analysis.visual_style && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Visual Style
                    </p>
                    <p className="text-xs text-foreground">
                      {analysis.analysis.visual_style}
                    </p>
                  </div>
                )}

                {analysis.analysis.composition && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Composition
                    </p>
                    <p className="text-xs text-foreground">
                      {analysis.analysis.composition}
                    </p>
                  </div>
                )}

                {analysis.analysis.lighting && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Lighting
                    </p>
                    <p className="text-xs text-foreground">
                      {analysis.analysis.lighting}
                    </p>
                  </div>
                )}

                {analysis.analysis.color_palette.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Color Palette
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {analysis.analysis.color_palette.map((color, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-accent text-[10px] text-foreground"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.analysis.mood && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Mood
                    </p>
                    <p className="text-xs text-foreground">
                      {analysis.analysis.mood}
                    </p>
                  </div>
                )}

                {analysis.analysis.food_styling && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Food Styling
                    </p>
                    <p className="text-xs text-foreground">
                      {analysis.analysis.food_styling}
                    </p>
                  </div>
                )}

                {analysis.analysis.text_overlays.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Text Detected
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {analysis.analysis.text_overlays.map((text, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary"
                        >
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column — Editable Form */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border border-border p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Template Details
                </h3>

                {/* Name */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Template name..."
                  />
                </div>

                {/* Category + Workspace */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="beverage, entree, promo..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Workspace
                    </label>
                    <select
                      value={formWorkspace}
                      onChange={(e) =>
                        setFormWorkspace(e.target.value as Workspace)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {(Object.keys(WORKSPACES) as Workspace[]).map((ws) => (
                        <option key={ws} value={ws}>
                          {WORKSPACES[ws].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Prompt Template
                  </label>
                  <textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    placeholder="Describe the image style with {variable} placeholders..."
                  />
                  {/* Variable badges */}
                  {promptVariables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {promptVariables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-medium"
                        >
                          {variableToLabel(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Negative Prompt
                  </label>
                  <input
                    type="text"
                    value={formNegative}
                    onChange={(e) => setFormNegative(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Things to avoid..."
                  />
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-1.5">
                    {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setFormAspect(ar)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                          formAspect === ar
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/30 text-muted-foreground"
                        )}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Preset + Premium */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Style Preset
                    </label>
                    <input
                      type="text"
                      value={formStylePreset}
                      onChange={(e) => setFormStylePreset(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="moody-overhead, bright-hero..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Tier
                    </label>
                    <button
                      onClick={() => setFormIsPremium(!formIsPremium)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all w-full",
                        formIsPremium
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : "bg-background text-muted-foreground hover:text-foreground border border-border"
                      )}
                    >
                      {formIsPremium ? "Premium" : "Standard"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formName.trim() || !formPrompt.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all glow-sm flex items-center justify-center gap-2"
                >
                  {isSaving ? (
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
                      Saving...
                    </>
                  ) : (
                    "Save Template"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Saved */}
        {step === "saved" && savedTemplate && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Template Saved!</p>
              <p className="text-sm text-muted-foreground mt-1">
                &ldquo;{savedTemplate.name}&rdquo; has been added to your{" "}
                {WORKSPACES[savedTemplate.workspace as Workspace]?.label || savedTemplate.workspace}{" "}
                templates.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/templates"
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                View in Templates
              </a>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-primary hover:opacity-90 transition-colors glow-sm"
              >
                Create Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
