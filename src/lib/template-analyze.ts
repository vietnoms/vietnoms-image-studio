import { type AspectRatio } from "./constants";
import { extractVariables } from "./templates";

// ── Types ───────────────────────────────────────────────────────────────

export interface TemplateAnalysis {
  visual_style: string;
  composition: string;
  lighting: string;
  color_palette: string[];
  text_overlays: string[];
  food_styling: string;
  background: string;
  mood: string;
}

export interface AnalyzedTemplate {
  name: string;
  category: string;
  prompt_text: string;
  negative_prompt: string;
  aspect_ratio: AspectRatio;
  style_preset: string;
  variables: string[];
  analysis: TemplateAnalysis;
}

// ── Gemini-powered screenshot analysis ──────────────────────────────────

const VALID_ASPECTS: AspectRatio[] = ["1:1", "9:16", "16:9", "4:5", "4:3"];

function validateAspectRatio(input: unknown): AspectRatio {
  const str = String(input || "1:1");
  return VALID_ASPECTS.includes(str as AspectRatio)
    ? (str as AspectRatio)
    : "1:1";
}

/**
 * Analyze a restaurant post screenshot and generate a reusable template.
 * Uses gemini-2.0-flash (TEXT mode) — same pattern as menu-extract.ts.
 */
export async function analyzeScreenshotForTemplate(
  imageBase64: string,
  mimeType: string
): Promise<AnalyzedTemplate> {
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
            text: `You are a restaurant marketing image analyst. Analyze this restaurant/food social media post screenshot and create a reusable image generation prompt template from it.

Examine the image carefully and extract:
1. Visual style (photography style, art direction)
2. Composition (layout, framing, angles)
3. Lighting (type, direction, mood)
4. Color palette (dominant colors, accents)
5. Text overlays (any text, fonts, placement)
6. Food styling (presentation, garnishes, props)
7. Background (setting, textures, environment)
8. Mood/atmosphere

Then create a REUSABLE prompt template that would generate similar images. Use {variable_name} placeholders for elements that should change between uses (e.g., {dish_name}, {beverage_name}, {promo_text}, {garnish}).

Return a JSON object with these fields:
- "name": a short descriptive template name (e.g., "Moody Overhead Bowl Shot")
- "category": one of "beverage", "entree", "appetizer", "dessert", "promo", "social", "lifestyle" — pick the best fit
- "prompt_text": the reusable prompt template with {variable_name} placeholders. Be detailed about style, lighting, composition, and mood. Include at least 2-3 {variables} for customizable elements.
- "negative_prompt": things to avoid (e.g., "blurry, low quality, watermark, text artifacts")
- "aspect_ratio": one of "1:1", "9:16", "16:9", "4:5", "4:3" — match what the screenshot appears to use
- "style_preset": a short kebab-case style tag (e.g., "moody-overhead", "bright-hero-shot", "lifestyle-casual")
- "analysis": an object with these fields:
  - "visual_style": description of the overall visual approach
  - "composition": how elements are arranged
  - "lighting": lighting setup description
  - "color_palette": array of 3-5 dominant color descriptions (e.g., ["warm amber", "deep green", "cream white"])
  - "text_overlays": array of any text visible in the image (empty array if none)
  - "food_styling": how the food/drink is presented
  - "background": description of the background/environment
  - "mood": overall feeling/atmosphere

Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  });

  // Parse response — same pattern as menu-extract.ts
  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    return {
      name: String(parsed.name || "Untitled Template").trim(),
      category: String(parsed.category || "Uncategorized").trim(),
      prompt_text: String(parsed.prompt_text || "").trim(),
      negative_prompt: String(parsed.negative_prompt || "").trim(),
      aspect_ratio: validateAspectRatio(parsed.aspect_ratio),
      style_preset: String(parsed.style_preset || "").trim(),
      variables: extractVariables(String(parsed.prompt_text || "")),
      analysis: {
        visual_style: String(parsed.analysis?.visual_style || ""),
        composition: String(parsed.analysis?.composition || ""),
        lighting: String(parsed.analysis?.lighting || ""),
        color_palette: Array.isArray(parsed.analysis?.color_palette)
          ? parsed.analysis.color_palette.map(String)
          : [],
        text_overlays: Array.isArray(parsed.analysis?.text_overlays)
          ? parsed.analysis.text_overlays.map(String)
          : [],
        food_styling: String(parsed.analysis?.food_styling || ""),
        background: String(parsed.analysis?.background || ""),
        mood: String(parsed.analysis?.mood || ""),
      },
    };
  } catch {
    throw new Error(
      `Failed to parse template analysis response. Raw: ${cleaned.slice(0, 200)}`
    );
  }
}
