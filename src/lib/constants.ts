export type Workspace = "vietnoms" | "lumination" | "general";

export type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5" | "4:3";

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  "1:1":  { width: 1024, height: 1024, label: "Square (1:1)" },
  "9:16": { width: 768,  height: 1344, label: "Portrait (9:16)" },
  "16:9": { width: 1344, height: 768,  label: "Landscape (16:9)" },
  "4:5":  { width: 896,  height: 1120, label: "Instagram (4:5)" },
  "4:3":  { width: 1152, height: 864,  label: "Standard (4:3)" },
};

export const WORKSPACES: Record<Workspace, { label: string; description: string; color: string }> = {
  vietnoms: {
    label: "Vietnoms",
    description: "Product photography for kiosk menus",
    color: "hsl(25, 95%, 53%)",
  },
  lumination: {
    label: "Lumination",
    description: "Brand visual assets & character art",
    color: "hsl(270, 70%, 55%)",
  },
  general: {
    label: "General",
    description: "General-purpose image generation",
    color: "hsl(210, 60%, 50%)",
  },
};

export const WORKSPACE_SYSTEM_PROMPTS: Record<Workspace, string> = {
  vietnoms: `You are generating professional product photography for Vietnoms, a Vietnamese fast-casual restaurant. Style guidelines:
- Clean, well-lit food photography with natural lighting
- White or light neutral backgrounds unless specified
- Appetizing presentation with Vietnamese culinary aesthetics
- Consistent brand feel: modern, fresh, vibrant
- Text rendering must be crisp and legible for kiosk displays
- Images should look like they belong on a digital menu board`,

  lumination: `You are generating visual assets for Lumination, a youth development community for ages 13-25 that uses anime, video games, and film characters to teach life skills through the hero's journey framework. Style guidelines:
- Anime/manga influenced art style with vibrant colors
- Empowering, aspirational imagery
- Appeal to ages 13-25
- Consistent with hero's journey archetypes
- Suitable for social media, presentations, and web content`,

  general: `Generate high-quality images based on the user's description. Focus on professional quality, accurate text rendering, and attention to detail.`,
};

export const IMAGE_COST_ESTIMATE = {
  generation: 0.18, // average cost per generated image
  editing: 0.15,
  upscale: 0.05,
};
