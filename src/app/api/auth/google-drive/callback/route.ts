import { NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return new Response(
      html("Error", "No authorization code received. Please try again."),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    await handleAuthCallback(code);
    return new Response(
      html("Connected!", "Google Drive connected successfully. This window will close automatically."),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Google Drive OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Authorization failed";
    return new Response(
      html("Error", `Failed to connect: ${message}`),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function html(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title} — Image Studio</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .card { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
  <script>
    setTimeout(() => { window.close(); }, 2000);
  </script>
</body>
</html>`;
}
