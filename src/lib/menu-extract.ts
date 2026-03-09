import { type ParsedMenuItem } from "./menu-items";

// ── Gemini-powered menu extraction ──────────────────────────────────────

/**
 * Extract menu items from a photo of a menu board using Gemini vision.
 * Uses the standard gemini-2.0-flash model (TEXT mode, not image-gen).
 */
export async function extractMenuFromImage(
  imageBase64: string,
  mimeType: string
): Promise<ParsedMenuItem[]> {
  const { GoogleGenAI } = await import("@google/genai");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `Extract all menu items from this menu board or menu photo.

Return a JSON array where each element has these fields:
- "name": the item name (required)
- "description": a brief description if visible (optional, empty string if not visible)
- "price": the price as shown including currency symbol (optional, empty string if not visible)
- "category": the menu section/category this item belongs to (e.g., "Beverages", "Entrees", "Appetizers", "Desserts") — infer from context if not explicitly labeled

Rules:
- Include ALL items visible on the menu
- If items are grouped under section headers, use those as the category
- If no sections are visible, infer logical categories from the item types
- Keep item names exactly as shown (preserve spelling, capitalization)
- Return ONLY the JSON array, no other text

Example output:
[
  {"name": "Pho Bo", "description": "Traditional beef noodle soup", "price": "$12.99", "category": "Soups"},
  {"name": "Boba Tea", "description": "", "price": "$5.50", "category": "Beverages"}
]`,
          },
        ],
      },
    ],
  });

  // Parse the response text as JSON
  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }
    return parsed.map(
      (item: Record<string, unknown>): ParsedMenuItem => ({
        name: String(item.name || "").trim(),
        description: String(item.description || "").trim(),
        price: String(item.price || "").trim(),
        category: String(item.category || "Uncategorized").trim(),
      })
    );
  } catch {
    throw new Error(
      `Failed to parse menu extraction response. Raw: ${cleaned.slice(0, 200)}`
    );
  }
}

// ── CSV Parsing ─────────────────────────────────────────────────────────

interface ParsedFileResult {
  columns: string[];
  rows: Record<string, string>[];
}

/** Parse a CSV string into columns + rows */
export function parseCSVString(csvString: string): ParsedFileResult {
  // Dynamic import to keep this module server-compatible
  const Papa = require("papaparse") as typeof import("papaparse");

  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  return {
    columns: result.meta.fields || [],
    rows: (result.data as Record<string, string>[]).map((row) => {
      const cleaned: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        cleaned[key] = String(val || "").trim();
      }
      return cleaned;
    }),
  };
}

/** Parse an XLSX/XLS buffer into columns + rows */
export function parseSpreadsheet(
  buffer: Buffer,
  _mimeType?: string
): ParsedFileResult {
  const XLSX = require("xlsx") as typeof import("xlsx");

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error("Spreadsheet has no sheets");
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = Object.keys(rows[0]);
  return { columns, rows };
}

/**
 * Map raw parsed rows to ParsedMenuItems using column mapping.
 * columnMap: { name: "Item Name", price: "Price", ... }
 */
export function mapRowsToItems(
  rows: Record<string, string>[],
  columnMap: Record<string, string>
): ParsedMenuItem[] {
  return rows
    .map((row) => ({
      name: row[columnMap.name] || "",
      description: row[columnMap.description] || "",
      price: row[columnMap.price] || "",
      category: row[columnMap.category] || "Uncategorized",
    }))
    .filter((item) => item.name.trim() !== "");
}
