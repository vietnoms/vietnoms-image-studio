# Lessons Learned

## Patterns & Rules

### File Operations
- Always `Read` a file before using `Write` — the Write tool will error otherwise.
- When creating new files (not editing existing), `Write` is fine without a prior Read.

### Build & Deploy
- Always run `next build` before deploying to catch TypeScript errors early.
- Vercel CLI is available via `npx vercel` — use `--yes --prod` for production deploys.
- In-memory stores (menu items, templates) are ephemeral on Vercel serverless — data resets on cold starts.
- Local filesystem storage (`public/storage/`) does not persist on Vercel — needs cloud storage for production.

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
