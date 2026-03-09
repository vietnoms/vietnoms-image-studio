"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { type Workspace, ASPECT_RATIOS, type AspectRatio } from "@/lib/constants";
import { type Template, extractVariables, variableToLabel } from "@/lib/templates";
import { cn } from "@/lib/utils";

interface TemplatesViewProps {
  workspace: Workspace;
}

export function TemplatesView({ workspace }: TemplatesViewProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formNegative, setFormNegative] = useState("");
  const [formAspect, setFormAspect] = useState<AspectRatio>("1:1");

  // Fetch templates
  const fetchTemplates = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/templates?workspace=${workspace}`)
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setIsLoading(false));
  }, [workspace]);

  useEffect(() => {
    fetchTemplates();
    setSelectedCategory(null);
    setEditingId(null);
    setShowCreateForm(false);
  }, [fetchTemplates]);

  // Categories
  const categories = useMemo(() => {
    return [...new Set(templates.map((t) => t.category))].sort();
  }, [templates]);

  // Filtered templates
  const filtered = useMemo(() => {
    let list = templates;
    if (selectedCategory) {
      list = list.filter((t) => t.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.prompt_text.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, selectedCategory, search]);

  // Start editing a template
  const startEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormCategory(tpl.category);
    setFormPrompt(tpl.prompt_text);
    setFormNegative(tpl.negative_prompt);
    setFormAspect(tpl.aspect_ratio);
    setShowCreateForm(false);
  };

  // Start creating a new template
  const startCreate = () => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormName("");
    setFormCategory("");
    setFormPrompt("");
    setFormNegative("");
    setFormAspect("1:1");
  };

  // Save (create or update)
  const handleSave = async () => {
    const body = {
      workspace,
      name: formName,
      category: formCategory,
      prompt_text: formPrompt,
      negative_prompt: formNegative,
      aspect_ratio: formAspect,
      style_preset: "",
    };

    try {
      if (editingId) {
        await fetch(`/api/templates/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setEditingId(null);
      setShowCreateForm(false);
      fetchTemplates();
    } catch {
      // Handle error silently
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch {
      // Handle error silently
    }
  };

  // Duplicate
  const handleDuplicate = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    try {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace: tpl.workspace,
          name: `${tpl.name} (Copy)`,
          category: tpl.category,
          prompt_text: tpl.prompt_text,
          negative_prompt: tpl.negative_prompt,
          aspect_ratio: tpl.aspect_ratio,
          style_preset: tpl.style_preset,
        }),
      });
      fetchTemplates();
    } catch {
      // Handle error silently
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Templates</h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
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
              placeholder="Search templates..."
              className="h-8 w-52 pl-8 pr-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>
          {/* Create button */}
          <button
            onClick={startCreate}
            className="h-8 px-4 rounded-lg text-xs font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Template
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-6 py-2 border-b border-border flex items-center gap-1.5">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-all duration-150",
            selectedCategory === null
              ? "gradient-primary text-white"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 capitalize",
              selectedCategory === cat
                ? "gradient-primary text-white"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Create form */}
        {showCreateForm && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-card/50 p-5 space-y-3">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">
              New Template
            </h3>
            <TemplateForm
              name={formName}
              category={formCategory}
              prompt={formPrompt}
              negative={formNegative}
              aspect={formAspect}
              onNameChange={setFormName}
              onCategoryChange={setFormCategory}
              onPromptChange={setFormPrompt}
              onNegativeChange={setFormNegative}
              onAspectChange={setFormAspect}
              onSave={handleSave}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Template list */}
        {filtered.length === 0 && !showCreateForm ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-md">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25v2.25a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                No templates found
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Create reusable prompt templates to speed up your generation workflow.
              </p>
            </div>
            <button
              onClick={startCreate}
              className="h-9 px-5 rounded-lg text-xs font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((tpl) => {
              const isEditing = editingId === tpl.id;
              const vars = extractVariables(tpl.prompt_text);

              if (isEditing) {
                return (
                  <div
                    key={tpl.id}
                    className="rounded-xl border border-primary/30 bg-card/50 p-5 space-y-3"
                  >
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">
                      Edit Template
                    </h3>
                    <TemplateForm
                      name={formName}
                      category={formCategory}
                      prompt={formPrompt}
                      negative={formNegative}
                      aspect={formAspect}
                      onNameChange={setFormName}
                      onCategoryChange={setFormCategory}
                      onPromptChange={setFormPrompt}
                      onNegativeChange={setFormNegative}
                      onAspectChange={setFormAspect}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-border bg-card/50 p-5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {tpl.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                          {tpl.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {ASPECT_RATIOS[tpl.aspect_ratio]?.label || tpl.aspect_ratio}
                        </span>
                        {tpl.usage_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Used {tpl.usage_count}x
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(tpl)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDuplicate(tpl.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        title="Duplicate"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Prompt preview */}
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-3">
                    {tpl.prompt_text}
                  </p>

                  {/* Variables */}
                  {vars.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {vars.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground font-mono"
                        >
                          {`{${v}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Template Form ──────────────────────────────────────────────────────
interface TemplateFormProps {
  name: string;
  category: string;
  prompt: string;
  negative: string;
  aspect: AspectRatio;
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onPromptChange: (v: string) => void;
  onNegativeChange: (v: string) => void;
  onAspectChange: (v: AspectRatio) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TemplateForm({
  name,
  category,
  prompt,
  negative,
  aspect,
  onNameChange,
  onCategoryChange,
  onPromptChange,
  onNegativeChange,
  onAspectChange,
  onSave,
  onCancel,
}: TemplateFormProps) {
  const vars = extractVariables(prompt);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Template name"
            className="w-full h-8 px-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder="e.g. beverage, entree"
            className="w-full h-8 px-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
          Prompt Template
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Use {variable_name} for dynamic values..."
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
        {vars.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {vars.map((v) => (
              <span
                key={v}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono"
              >
                {variableToLabel(v)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
          Negative Prompt (optional)
        </label>
        <input
          type="text"
          value={negative}
          onChange={(e) => onNegativeChange(e.target.value)}
          placeholder="Things to avoid..."
          className="w-full h-8 px-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
          Aspect Ratio
        </label>
        <div className="flex gap-1.5">
          {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ar) => (
            <button
              key={ar}
              onClick={() => onAspectChange(ar)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                aspect === ar
                  ? "gradient-primary text-white"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {ar}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!name.trim() || !prompt.trim()}
          className="h-8 px-4 rounded-lg text-xs font-medium text-white gradient-primary hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="h-8 px-4 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-accent/50 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
