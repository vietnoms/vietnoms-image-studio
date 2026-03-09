import { NextRequest, NextResponse } from "next/server";
import { getTags } from "@/lib/image-store";
import { type Workspace } from "@/lib/constants";

// GET /api/tags?workspace=vietnoms
export async function GET(request: NextRequest) {
  const workspace = new URL(request.url).searchParams.get("workspace") as
    | Workspace
    | null;

  const tags = getTags(workspace || undefined);
  return NextResponse.json({ tags });
}
