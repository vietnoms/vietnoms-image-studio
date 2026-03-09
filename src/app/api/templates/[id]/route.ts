import { NextRequest, NextResponse } from "next/server";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "@/lib/db/templates";
import { type AspectRatio, type Workspace } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/templates/:id */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const template = await getTemplateById(id);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

/** PUT /api/templates/:id — update a template */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      category,
      prompt_text,
      negative_prompt,
      aspect_ratio,
      style_preset,
      workspace,
    } = body as {
      name?: string;
      category?: string;
      prompt_text?: string;
      negative_prompt?: string;
      aspect_ratio?: AspectRatio;
      style_preset?: string;
      workspace?: Workspace;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (prompt_text !== undefined) updates.prompt_text = prompt_text;
    if (negative_prompt !== undefined) updates.negative_prompt = negative_prompt;
    if (aspect_ratio !== undefined) updates.aspect_ratio = aspect_ratio;
    if (style_preset !== undefined) updates.style_preset = style_preset;
    if (workspace !== undefined) updates.workspace = workspace;

    const template = await updateTemplate(id, updates);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Update template error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/templates/:id */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const deleted = await deleteTemplate(id);

  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

/** PATCH /api/templates/:id — duplicate a template */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const duplicate = await duplicateTemplate(id);

  if (!duplicate) {
    return NextResponse.json(
      { error: "Source template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ template: duplicate }, { status: 201 });
}
