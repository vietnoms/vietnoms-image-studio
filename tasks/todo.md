# Current Tasks

## Session: 2026-03-09 — Phase 5: Batch Generation

- [x] Add batch mode toggle + cost estimate to GeneratePanel
- [x] Create `BatchProgress.tsx` — progress bar, per-item status, cancel/done buttons
- [x] Implement `handleBatchGenerate()` — sequential API calls with progress tracking
- [x] Wire batch results into ResultPreview (first success shown on "View Results")
- [x] Build passes clean, Studio page loads without errors

### What Changed
- **Batch mode toggle** — When 2+ items and a template are selected, a toggle switch enables batch mode
- **Cost estimate** — Shows `N items × $0.18 = $X.XX estimated` when batch mode is active
- **"Generate All (N)" button** — Replaces single Generate button in batch mode
- **Progress UI** — BatchProgress component shows progress bar, per-item status (pending/generating/done/error), thumbnails, and Cancel button
- **Sequential generation** — Calls `/api/generate` once per item with auto-filled template variables (name, description, price, category)
- **Cancellation** — Uses `useRef` to cancel mid-batch without stale closure issues, remaining items marked as cancelled

### Files Created (1)
- `src/components/studio/BatchProgress.tsx`

### Files Modified (1)
- `src/components/studio/GeneratePanel.tsx` (batch state, buildPromptForItem, handleBatchGenerate, batch UI)

## Session: 2026-03-09 — Phase 4: Image Editing with Mask Painting

- [x] Create `MaskCanvas.tsx` — HTML5 Canvas overlay for painting edit masks (paint/erase modes, custom brush cursor, white-on-black mask export)
- [x] Integrate MaskCanvas into EditorView — Mask tool in toolbar, brush size/mode controls, mask overlay on images
- [x] Update `/api/edit` route — pass `mask` field through to `editImage()` in Gemini
- [x] Add Gallery → Editor flow — "Edit" button in gallery detail panel navigates to `/editor?image=<url>`
- [x] Wrap EditorView in `<Suspense>` for `useSearchParams` support
- [x] Build passes clean, dev server verified

### What Changed
- **Mask painting tool** — New "Mask" tool in Editor toolbar lets users paint a semi-transparent red overlay on specific regions of an image, then describe edits that apply only to that region
- **Erase tool enhanced** — Erase tool now also activates the mask canvas for region-specific erasure
- **Brush controls** — Properties panel shows Paint/Erase mode toggle, brush size slider (5-80px), and Clear Mask button when mask tool is active
- **Gallery → Editor** — "Edit" button in gallery detail panel sends image URL to Editor via query param
- **Gemini mask support** — Mask is exported as white-on-black PNG and passed to Gemini API for region-specific editing

### Files Created (1)
- `src/components/editor/MaskCanvas.tsx`

### Files Modified (4)
- `src/components/editor/EditorView.tsx` (mask tool, brush controls, query param loading)
- `src/app/api/edit/route.ts` (mask passthrough)
- `src/components/gallery/GalleryView.tsx` (Edit button)
- `src/app/editor/page.tsx` (Suspense wrapper)

## Session: 2026-03-09 — Supabase Migration + Persistence Fix

- [x] Create `supabase/migrations/002_pragmatic_stores.sql` — schema for menu_items, stored_images, templates tables
- [x] Create `src/lib/db/client.ts` — Supabase admin client wrapper
- [x] Create `src/lib/db/templates.ts` — async Supabase CRUD for templates
- [x] Create `src/lib/db/menu-items.ts` — async Supabase CRUD with deduplication on import
- [x] Create `src/lib/db/images.ts` — async Supabase CRUD for stored images
- [x] Update template API routes (2 files) to use Supabase db layer
- [x] Update menu-items API routes (5 files) to use Supabase db layer
- [x] Update image API routes (5 files: images, bulk, tags, generate, edit) to use Supabase db layer
- [x] Complete Phase 3: Add generation metadata (model, cost) to gallery detail panel
- [x] Fix Google Drive token storage — migrated from filesystem to Vercel Blob (same pattern as Square)
- [x] Cleanup old in-memory stores — strip to types-only (keep utility functions in templates.ts)
- [x] Build passes clean (0 TypeScript errors)
- [x] Run `002_pragmatic_stores.sql` in Supabase SQL Editor
- [x] Supabase env vars already configured on Vercel
- [x] Deploy to Vercel and verify persistence — templates API returns 4 Vietnoms templates from DB

### What Changed
- **All data now persists in Supabase PostgreSQL** — menu items, generated images, and templates survive serverless cold starts
- **Zero frontend changes** — only `src/lib/` store layer and API route imports changed
- **Deduplication on Square import** — re-importing same items no longer creates duplicates
- **fs.rm() bug fixed** — DELETE route now cleans up via Vercel Blob instead of filesystem
- **Google Drive tokens** — migrated from `.google-drive-token.json` to Vercel Blob

### Files Created (5)
- `supabase/migrations/002_pragmatic_stores.sql`
- `src/lib/db/client.ts`
- `src/lib/db/templates.ts`
- `src/lib/db/menu-items.ts`
- `src/lib/db/images.ts`

### Files Modified (14)
- 12 API route files (import path + `await` additions)
- `src/lib/google-drive.ts` (token storage → Vercel Blob)
- `src/components/gallery/GalleryView.tsx` (model/cost metadata in detail panel)

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

## Session: 2026-03-08 — Phase 3: Gallery & Approval Enhancements

- [x] Extend image-store.ts: `tags` field, `"archived"` status, `bulkUpdateImages`, `getTags`
- [x] Gallery API: tag filter param, tags in PATCH, DELETE handler
- [x] POST /api/images/bulk endpoint (approve/reject/archive/favorite/unfavorite)
- [x] GET /api/tags endpoint (list unique tags per workspace)
- [x] GalleryView: bulk selection mode with checkboxes + bulk action bar
- [x] GalleryView: tag filter dropdown in header
- [x] GalleryView: tag display/add/remove in detail panel
- [x] GalleryView: "Archived" filter tab + archive button in detail panel
- [x] Update addImage callers (generate + edit routes) with `tags: []`
- [x] Build passes clean, dev server renders gallery correctly

### Review
- **Bulk selection**: "Select" toggle enters mode, checkboxes on each card, floating bar with Approve/Reject/Archive/Select All/Clear
- **Tags**: Inline add/remove in detail panel, filter dropdown auto-appears when tags exist
- **Archive**: Fourth status alongside pending/approved/rejected, dedicated filter tab in gallery
- **API**: DELETE `/api/images?id=`, bulk POST `/api/images/bulk`, tag listing GET `/api/tags`
- No console errors, all routes return 200, build passes cleanly

## Completed (Previous Sessions)

- [x] Phase 1: Foundation (project setup, Gemini integration, studio UI)
- [x] Google Drive auto-upload on approve
- [x] Phase 2: Templates & Workspaces system
- [x] Menu Item Catalog (CRUD, import, OCR, reference photos)
- [x] Wire ItemPicker into GeneratePanel + PromptInput
- [x] Full UI redesign with Cosmic Night theme
- [x] Initial Vercel deployment
