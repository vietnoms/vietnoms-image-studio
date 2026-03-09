# Current Tasks

## Session: 2026-03-08 (cont.) — Wire Backend to Pages + Redeploy

- [x] Create shared image store (`src/lib/image-store.ts`) + `/api/images` route
- [x] Create `/api/edit` route for Gemini AI image editing
- [x] Wire `/api/generate` to persist images to shared store
- [x] Rewrite Gallery to fetch from `/api/images` with filters, favorites, status updates, detail panel
- [x] Rewrite Editor to call `/api/edit` with real Gemini integration, undo/reset history, quick edit presets
- [x] Verify build and redeploy to Vercel

### Review
- **Shared Image Store** (`image-store.ts`): In-memory CRUD with filtering (workspace, status, favorites, search). `/api/images` supports GET + PATCH.
- **Gallery** now fetches real data from `/api/images`, supports favorite toggling, approve/reject from detail panel, refresh button.
- **Editor** now calls Gemini's `editImage` via `/api/edit`. Supports undo history, reset to original, per-tool quick edit presets, edit count badge.
- **Generate route** (`/api/generate`) now persists every generated image to the shared store automatically.

## Session: 2026-03-08 — Build Missing Pages + Redeploy

- [x] Create tasks directory with todo.md and lessons.md
- [x] Build Gallery page — view all generated images
- [x] Build Templates management page
- [x] Build Editor page — image editing/adjustment
- [x] Verify build and redeploy to Vercel

## Completed (Previous Sessions)

- [x] Phase 1: Foundation (project setup, Gemini integration, studio UI)
- [x] Google Drive auto-upload on approve
- [x] Phase 2: Templates & Workspaces system
- [x] Menu Item Catalog (CRUD, import, OCR, reference photos)
- [x] Wire ItemPicker into GeneratePanel + PromptInput
- [x] Full UI redesign with Cosmic Night theme
- [x] Initial Vercel deployment
