import { NextRequest, NextResponse } from "next/server";
import {
  getTemplates,
  createTemplate,
  type Template,
} from "@/lib/templates";
import { type Workspace, type AspectRatio } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/templates?workspace=vietnoms */
export async function GET(request: NextRequest) {
  const workspace = request.nextUrl.searchParams.get("workspace") as
    | Workspace
    | null;

  const templates = getTemplates(workspace ?? undefined);
  return NextResponse.json({ templates });
}

/** POST /api/templates — create a new template */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace, name, category, prompt_text, negative_prompt, aspect_ratio, style_preset } =
      body as {
        workspace: Workspace;
        name: string;
        category: string;
        prompt_text: string;
        negative_prompt?: string;
        aspect_ratio?: AspectRatio;
        style_preset?: string;
      };

    if (!workspace || !name || !prompt_text) {
      return NextResponse.json(
        { error: "workspace, name, and prompt_text are required" },
        { status: 400 }
      );
    }

    const template: Template = createTemplate({
      workspace,
      name,
      category: category || "Uncategorized",
      prompt_text,
      negative_prompt: negative_prompt || "",
      aspect_ratio: aspect_ratio || "1:1",
      style_preset: style_preset || "",
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
