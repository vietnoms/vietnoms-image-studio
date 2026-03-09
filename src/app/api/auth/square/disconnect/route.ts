import { NextResponse } from "next/server";
import { disconnectSquare } from "@/lib/square";

export async function POST() {
  try {
    await disconnectSquare();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Square disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
