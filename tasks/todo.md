# Current Tasks

## Session: 2026-03-08 — Square POS Integration

- [x] Create `src/lib/square.ts` — OAuth + catalog client (token storage, auth flow, paginated catalog fetch)
- [x] Create auth routes: `/api/auth/square/` (route, callback, status, disconnect)
- [x] Create `/api/menu-items/square` — catalog fetch (GET) + confirmed import (POST) with optional image download
- [x] Create `src/hooks/useSquare.ts` — client hook mirroring useGoogleDrive
- [x] Add Square POS tab to ImportDialog (3 states: connect, fetch, review/import)
- [x] Update `.env.example` with Square env vars
- [x] Verify build + deploy

### Review
- **OAuth flow**: Mirrors Google Drive exactly — popup auth, token file `.square-token.json`, auto-refresh on 30-day expiry, revoke on disconnect.
- **Catalog fetch**: Paginated `GET /v2/catalog/list?types=ITEM,CATEGORY,IMAGE`. Resolves category names and image URLs from separate objects. Maps to `ParsedMenuItem[]`.
- **Import tab**: 4th tab "Square POS" in ImportDialog. States: not connected → connect button; connected → fetch button; fetched → editable table + "Download product images" checkbox.
- **Image download**: Optional — fetches Square product images, saves to Vercel Blob as reference images on imported items.
- **No new npm dependencies** — uses raw `fetch()` against Square REST API.

## Session: 2026-03-08 — Vercel Blob Migration + GitHub CI

- [x] Install `@vercel/blob` and create Blob store (`studio-blob`)
- [x] Rewrite `src/lib/storage.ts` — replace local fs with `@vercel/blob` `put()`/`del()`
- [x] Update `/api/approve` — fetch from Blob URL instead of local disk
- [x] Update `/api/menu-items/[id]/references` — use `saveReferenceImage()` for Blob
- [x] Update `src/lib/google-drive.ts` — accept `Buffer` instead of `filepath`
- [x] Link GitHub repo to Vercel for auto-deploy on push
- [x] Verify build + deploy to production

### Review
- **Storage migration**: All image storage now uses Vercel Blob (`@vercel/blob`). Images are stored as public blobs with URLs like `https://*.public.blob.vercel-storage.com/images/...`. No more local filesystem writes.
- **Google Drive**: Now accepts `Buffer` directly instead of reading from disk via `fss.createReadStream`.
- **Approve route**: Fetches image from Blob URL via `fetch()`, then passes buffer to Drive upload.
- **References route**: Uses `saveReferenceImage()` from storage.ts for Blob uploads.
- **GitHub → Vercel CI**: Repo `vietnoms/vietnoms-image-studio` linked to Vercel project. Pushes to `main` trigger production deploys.

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
