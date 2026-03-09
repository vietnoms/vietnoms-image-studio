import { GoogleGenAI } from "@google/genai";
import { WORKSPACE_SYSTEM_PROMPTS, ASPECT_RATIOS, type Workspace, type AspectRatio } from "./constants";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to your .env.local file.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  workspace?: Workspace;
  referenceImages?: { data: string; mimeType: string }[];
  model?: string;
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  mimeType: string;
  prompt: string;
  model: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const ai = getClient();
  const {
    prompt,
    negativePrompt,
    aspectRatio = "1:1",
    workspace = "general",
    referenceImages = [],
    model = "gemini-2.0-flash-preview-image-generation",
  } = options;

  const systemPrompt = WORKSPACE_SYSTEM_PROMPTS[workspace];
  const dimensions = ASPECT_RATIOS[aspectRatio];

  // Build the full prompt
  let fullPrompt = prompt;
  if (negativePrompt) {
    fullPrompt += `\n\nAvoid: ${negativePrompt}`;
  }
  fullPrompt += `\n\nTarget dimensions: ${dimensions.width}x${dimensions.height} pixels.`;

  // Build message parts
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add reference images if provided
  for (const ref of referenceImages) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
  }
  if (referenceImages.length > 0) {
    parts.push({ text: "Maintain visual consistency with the provided reference images.\n\n" + fullPrompt });
  } else {
    parts.push({ text: fullPrompt });
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: systemPrompt,
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  // Extract image from response
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("No response from Gemini API. The prompt may have been filtered.");
  }

  const candidate = response.candidates[0];
  if (!candidate.content?.parts) {
    throw new Error("No content in Gemini response.");
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      return {
        imageBuffer: buffer,
        mimeType: part.inlineData.mimeType || "image/png",
        prompt: fullPrompt,
        model,
      };
    }
  }

  throw new Error("No image was generated. The model returned text only. Try a different prompt.");
}

export interface EditImageOptions {
  imageBase64: string;
  imageMimeType: string;
  instruction: string;
  mask?: string; // base64 mask image
  model?: string;
}

export async function editImage(options: EditImageOptions): Promise<GenerateImageResult> {
  const ai = getClient();
  const {
    imageBase64,
    imageMimeType,
    instruction,
    mask,
    model = "gemini-2.0-flash-preview-image-generation",
  } = options;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Source image
  parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });

  // Mask if provided
  if (mask) {
    parts.push({ inlineData: { mimeType: "image/png", data: mask } });
    parts.push({ text: `Using the provided mask (white areas = edit region), apply this edit: ${instruction}` });
  } else {
    parts.push({ text: instruction });
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error("No content in Gemini edit response.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      return {
        imageBuffer: buffer,
        mimeType: part.inlineData.mimeType || "image/png",
        prompt: instruction,
        model,
      };
    }
  }

  throw new Error("No edited image was generated.");
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
