"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Workspace } from "@/lib/constants";
import { type ParsedMenuItem } from "@/lib/menu-items";
import { useSquare } from "@/hooks/useSquare";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  onImportComplete: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  workspace,
  onImportComplete,
}: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Menu Items</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="photo" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="photo" className="flex-1">
              Menu Board Photo
            </TabsTrigger>
            <TabsTrigger value="file" className="flex-1">
              CSV / Spreadsheet
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="square" className="flex-1">
              Square POS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="mt-4">
            <PhotoExtractTab
              workspace={workspace}
              onComplete={() => {
                onImportComplete();
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="file" className="mt-4">
            <FileImportTab
              workspace={workspace}
              onComplete={() => {
                onImportComplete();
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualEntryTab
              workspace={workspace}
              onComplete={() => {
                onImportComplete();
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="square" className="mt-4">
            <SquareImportTab
              workspace={workspace}
              onComplete={() => {
                onImportComplete();
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 1: Menu Board Photo Extraction ──────────────────────────────────

function PhotoExtractTab({
  workspace,
  onComplete,
}: {
  workspace: Workspace;
  onComplete: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ParsedMenuItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) {
      const f = files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setExtractedItems([]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
  });

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("workspace", workspace);

      const res = await fetch("/api/menu-items/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      setExtractedItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number, field: keyof ParsedMenuItem, value: string) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImport = async () => {
    if (extractedItems.length === 0) return;
    setIsImporting(true);

    try {
      const res = await fetch("/api/menu-items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: extractedItems,
          workspace,
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone or preview */}
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <input {...getInputProps()} />
          <svg
            className="w-10 h-10 mx-auto text-muted-foreground mb-2"
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
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">
            Drop a menu board photo here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            AI will extract all menu items automatically
          </p>
        </div>
      ) : (
        <div className="flex gap-3 items-start">
          {preview && (
            <img
              src={preview}
              alt="Menu board"
              className="w-32 h-32 object-cover rounded-md border border-border"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleExtract}
                disabled={isExtracting}
              >
                {isExtracting ? "Extracting..." : "Extract Items"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setExtractedItems([]);
                }}
              >
                Change Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Extracted items table */}
      {extractedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Extracted {extractedItems.length} items
            </h4>
            <Button size="sm" onClick={handleImport} disabled={isImporting}>
              {isImporting
                ? "Importing..."
                : `Import All (${extractedItems.length})`}
            </Button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Name
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Price
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Category
                  </th>
                  <th className="px-3 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {extractedItems.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <input
                        value={item.name}
                        onChange={(e) =>
                          handleEditItem(idx, "name", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={item.price || ""}
                        onChange={(e) =>
                          handleEditItem(idx, "price", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none text-muted-foreground"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={item.category || ""}
                        onChange={(e) =>
                          handleEditItem(idx, "category", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none text-muted-foreground"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: CSV / Spreadsheet Import ─────────────────────────────────────

function FileImportTab({
  workspace,
  onComplete,
}: {
  workspace: Workspace;
  onComplete: () => void;
}) {
  const [parsedData, setParsedData] = useState<{
    columns: string[];
    rows: Record<string, string>[];
  } | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    name: "",
    description: "",
    price: "",
    category: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("workspace", workspace);

        const res = await fetch("/api/menu-items/import", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parse failed");

        setParsedData({ columns: data.columns, rows: data.rows });

        // Auto-map columns by common names
        const autoMap: Record<string, string> = {
          name: "",
          description: "",
          price: "",
          category: "",
        };
        for (const col of data.columns) {
          const lower = col.toLowerCase();
          if (
            lower.includes("name") ||
            lower.includes("item") ||
            lower.includes("product")
          )
            autoMap.name = col;
          else if (
            lower.includes("desc") ||
            lower.includes("description")
          )
            autoMap.description = col;
          else if (lower.includes("price") || lower.includes("cost"))
            autoMap.price = col;
          else if (
            lower.includes("category") ||
            lower.includes("type") ||
            lower.includes("section")
          )
            autoMap.category = col;
        }
        setColumnMap(autoMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Parse failed");
      } finally {
        setIsUploading(false);
      }
    },
    [workspace]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!parsedData || !columnMap.name) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/menu-items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedData.rows,
          columnMap,
          workspace,
          confirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  if (!parsedData) {
    return (
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border"
          } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <svg
            className="w-10 h-10 mx-auto text-muted-foreground mb-2"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">
            {isUploading
              ? "Parsing file..."
              : "Drop a CSV or Excel file here, or click to browse"}
          </p>
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column mapping */}
      <div>
        <h4 className="text-sm font-medium mb-2">Map Columns</h4>
        <div className="grid grid-cols-2 gap-2">
          {(["name", "description", "price", "category"] as const).map(
            (field) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground capitalize">
                  {field}
                  {field === "name" && " *"}
                </label>
                <select
                  value={columnMap[field]}
                  onChange={(e) =>
                    setColumnMap((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">— Skip —</option>
                  {parsedData.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>
      </div>

      {/* Preview */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          Preview ({parsedData.rows.length} rows)
        </h4>
        <div className="border border-border rounded-lg overflow-auto max-h-48">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {parsedData.columns.slice(0, 5).map((col) => (
                  <th
                    key={col}
                    className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.rows.slice(0, 5).map((row, idx) => (
                <tr key={idx} className="border-t border-border">
                  {parsedData.columns.slice(0, 5).map((col) => (
                    <td
                      key={col}
                      className="px-2 py-1 text-muted-foreground whitespace-nowrap"
                    >
                      {row[col]?.slice(0, 30)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleImport}
          disabled={!columnMap.name || isImporting}
        >
          {isImporting
            ? "Importing..."
            : `Import ${parsedData.rows.length} Items`}
        </Button>
        <Button variant="ghost" onClick={() => setParsedData(null)}>
          Choose Different File
        </Button>
      </div>
    </div>
  );
}

// ── Tab 3: Manual Entry ─────────────────────────────────────────────────

function ManualEntryTab({
  workspace,
  onComplete,
}: {
  workspace: Workspace;
  onComplete: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace,
          name: name.trim(),
          description: description.trim(),
          price: price.trim(),
          category: category.trim() || "Uncategorized",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");

      setAdded((prev) => prev + 1);
      setName("");
      setDescription("");
      setPrice("");
      // Keep category for next item (usually same category)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Pho Bo"
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Price</label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., $12.99"
            className="h-9"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)"
          className="h-9"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Category</label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Beverages, Entrees"
          className="h-9"
        />
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleAdd} disabled={!name.trim() || isAdding}>
          {isAdding ? "Adding..." : "Add Item"}
        </Button>
        {added > 0 && (
          <span className="text-xs text-muted-foreground">
            {added} item{added !== 1 ? "s" : ""} added
          </span>
        )}
      </div>

      {added > 0 && (
        <div className="pt-2 border-t border-border">
          <Button variant="outline" onClick={onComplete}>
            Done — View Catalog
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Square POS Import ──────────────────────────────────────────

function SquareImportTab({
  workspace,
  onComplete,
}: {
  workspace: Workspace;
  onComplete: () => void;
}) {
  const square = useSquare();
  const [items, setItems] = useState<ParsedMenuItem[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [downloadImages, setDownloadImages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    setIsFetching(true);
    setError(null);

    try {
      const res = await fetch("/api/menu-items/square");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch catalog");

      setItems(data.items || []);
      setImageMap(data.images || {});
      setFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch catalog");
    } finally {
      setIsFetching(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number, field: keyof ParsedMenuItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImport = async () => {
    if (items.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/menu-items/square", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          workspace,
          downloadImages,
          imageMap,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  // State A: Not connected
  if (!square.connected) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <svg
            className="w-10 h-10 mx-auto text-muted-foreground mb-2"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
            />
          </svg>
          <p className="text-sm font-medium mb-1">Import from Square POS</p>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your Square account to import your item catalog directly.
          </p>
          {!square.configured ? (
            <p className="text-xs text-muted-foreground">
              Square is not configured. Add <code className="text-xs">SQUARE_APP_ID</code> and{" "}
              <code className="text-xs">SQUARE_APP_SECRET</code> to your environment.
            </p>
          ) : (
            <Button
              onClick={square.connect}
              disabled={square.isConnecting}
            >
              {square.isConnecting ? "Connecting..." : "Connect Square Account"}
            </Button>
          )}
        </div>

        {(error || square.error) && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error || square.error}
          </div>
        )}
      </div>
    );
  }

  // State B: Connected but not fetched yet
  if (!fetched) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Connected to Square</span>
          </div>
          <button
            onClick={square.disconnect}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Pull your item catalog from Square to review and import.
          </p>
          <Button onClick={handleFetch} disabled={isFetching}>
            {isFetching ? "Fetching..." : "Fetch Catalog Items"}
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  // State C: Items fetched — show editable preview table
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">Connected to Square</span>
        </div>
        <button
          onClick={square.disconnect}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Disconnect
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No items found in your Square catalog.
          </p>
          <Button variant="ghost" onClick={handleFetch} disabled={isFetching}>
            {isFetching ? "Fetching..." : "Retry"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Found {items.length} items from Square
            </h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFetch}
                disabled={isFetching}
              >
                {isFetching ? "Fetching..." : "Refetch"}
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting
                  ? "Importing..."
                  : `Import All (${items.length})`}
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Name
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Price
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium">
                    Category
                  </th>
                  <th className="px-3 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <input
                        value={item.name}
                        onChange={(e) =>
                          handleEditItem(idx, "name", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={item.price || ""}
                        onChange={(e) =>
                          handleEditItem(idx, "price", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none text-muted-foreground"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={item.category || ""}
                        onChange={(e) =>
                          handleEditItem(idx, "category", e.target.value)
                        }
                        className="bg-transparent w-full text-sm focus:outline-none text-muted-foreground"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Object.keys(imageMap).length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">
                Download product images as references ({Object.keys(imageMap).length} available)
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
