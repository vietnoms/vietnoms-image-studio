import { NextRequest } from "next/server";
import sharp from "sharp";
import archiver from "archiver";
import { getDb } from "@/lib/db/client";
import { imageToBuffer } from "@/lib/storage";

interface ExportRequest {
  ids: string[];
  format: "png" | "jpeg" | "webp";
  quality: number;
  resolution: "original" | "medium" | "thumbnail";
}

function getTargetDimensions(
  width: number,
  height: number,
  resolution: ExportRequest["resolution"]
): { width: number; height: number } | null {
  switch (resolution) {
    case "original":
      return null;
    case "medium":
      return {
        width: Math.round(width * 0.5),
        height: Math.round(height * 0.5),
      };
    case "thumbnail": {
      const scale = Math.min(200 / width, 200 / height);
      return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ExportRequest>;
    const { ids, format = "png", quality = 90, resolution = "original" } = body;

    if (!ids?.length) {
      return new Response(JSON.stringify({ error: "ids are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (ids.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximum 100 images per export" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch image records from Supabase
    const db = getDb();
    const { data: rows, error: dbError } = await db
      .from("stored_images")
      .select("id, url, prompt, workspace")
      .in("id", ids);

    if (dbError) throw dbError;
    if (!rows?.length) {
      return new Response(JSON.stringify({ error: "No images found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream ZIP via archiver → ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const archive = archiver("zip", { zlib: { level: 1 } });

        archive.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        archive.on("end", () => {
          controller.close();
        });
        archive.on("error", (err) => {
          controller.error(err);
        });

        // Process in parallel batches of 5
        const BATCH_SIZE = 5;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(async (row) => {
              const buffer = await imageToBuffer(row.url);
              let pipeline = sharp(buffer);

              const metadata = await pipeline.metadata();
              const origW = metadata.width || 1024;
              const origH = metadata.height || 1024;

              const dims = getTargetDimensions(origW, origH, resolution);
              if (dims) {
                pipeline = pipeline.resize(dims.width, dims.height, {
                  fit: "inside",
                  withoutEnlargement: true,
                });
              }

              const ext = format;
              switch (format) {
                case "jpeg":
                  pipeline = pipeline.jpeg({ quality });
                  break;
                case "webp":
                  pipeline = pipeline.webp({ quality });
                  break;
                case "png":
                default:
                  pipeline = pipeline.png();
                  break;
              }

              const outputBuffer = await pipeline.toBuffer();

              // Build filename: {workspace}/{sanitized_prompt}_{id_prefix}.{ext}
              const safeName = (row.prompt || row.id)
                .replace(/[^a-zA-Z0-9_\- ]/g, "")
                .replace(/\s+/g, "_")
                .slice(0, 60);
              const filename = `${row.workspace}/${safeName}_${row.id.slice(0, 8)}.${ext}`;

              return { filename, buffer: outputBuffer };
            })
          );

          for (const result of results) {
            if (result.status === "fulfilled") {
              archive.append(Buffer.from(result.value.buffer), {
                name: result.value.filename,
              });
            }
          }
        }

        await archive.finalize();
      },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="image-export-${timestamp}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
