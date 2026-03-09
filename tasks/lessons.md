# Lessons Learned

## Patterns & Rules

### File Operations
- Always `Read` a file before using `Write` — the Write tool will error otherwise.
- When creating new files (not editing existing), `Write` is fine without a prior Read.

### Build & Deploy
- Always run `next build` before deploying to catch TypeScript errors early.
- Vercel CLI is available via `npx vercel` — use `--yes --prod` for production deploys.
- In-memory stores (menu items, templates) are ephemeral on Vercel serverless — data resets on cold starts.
- Local filesystem storage (`public/storage/`) does not persist on Vercel — use Vercel Blob instead.
- Vercel Blob: use `put(pathname, buffer, { access: "public" })` for uploads, `del(url)` for deletes.
- Vercel CLI interactive prompts (e.g. `blob create-store`) can hang on environment selector — use the Vercel REST API as fallback.
- To link GitHub repo to Vercel project: use `POST /v13/projects/{id}/link` with `{ type: "github", repo: "org/repo", productionBranch: "main" }`.
- `BLOB_READ_WRITE_TOKEN` must be linked to all environments (production + preview + development) for the store to work everywhere.
- **Serverless filesystem is read-only** — never use `fs.writeFile` to persist data on Vercel. Use Vercel Blob, KV, or a database instead. This broke Square OAuth token storage (was writing `.square-token.json` to disk).
- When adding a new integration that requires env vars, always remind the user to add them to the Vercel dashboard too — `.env.local` is local-only.

### UI/Theming
- The project uses Tailwind CSS v4 with oklch color space (Cosmic Night theme, hue 280).
- Custom gradient utilities: `gradient-primary`, `gradient-text`, `glass`, `glow-sm`, `glow-md`.
- All pages use the shared layout pattern: `Sidebar + TopBar + main content`.
- shadcn/ui v4 components are available — use them for consistency.

### API & Gemini
- `gemini-2.0-flash` for OCR/text extraction (TEXT mode).
- `gemini-2.0-flash-preview-image-generation` for image generation.
- Reference images: up to ~12 per generation, fetched client-side and converted to base64.
- Template variables auto-fill from selected menu items.

### Session Management
- Always read `tasks/lessons.md` at session start per CLAUDE.md.
- Track work in `tasks/todo.md` with checkable items.
