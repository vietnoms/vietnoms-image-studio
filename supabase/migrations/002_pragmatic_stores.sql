-- Pragmatic data stores for menu items, images, and templates.
-- Replaces unused SaaS tables from 001_initial_schema.sql.
-- Run this in the Supabase SQL Editor.

-- Drop unused SaaS tables (never had real data)
DROP TABLE IF EXISTS image_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS brand_profiles CASCADE;
DROP TABLE IF EXISTS org_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ── Menu Items ─────────────────────────────────────────────────────────
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  category TEXT DEFAULT 'Uncategorized',
  reference_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_workspace ON menu_items(workspace);
CREATE INDEX idx_menu_items_ws_category ON menu_items(workspace, category);

-- ── Stored Images (metadata only; blobs stay in Vercel Blob) ───────────
CREATE TABLE stored_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '1:1',
  workspace TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','archived')),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  drive_link TEXT,
  model TEXT,
  cost_estimate REAL,
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_stored_images_workspace ON stored_images(workspace);
CREATE INDEX idx_stored_images_ws_status ON stored_images(workspace, status);
CREATE INDEX idx_stored_images_created ON stored_images(created_at DESC);

-- ── Templates ──────────────────────────────────────────────────────────
CREATE TABLE templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Uncategorized',
  prompt_text TEXT NOT NULL,
  negative_prompt TEXT DEFAULT '',
  aspect_ratio TEXT DEFAULT '1:1',
  style_preset TEXT DEFAULT '',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON templates(workspace);

-- ── Seed Templates (idempotent) ────────────────────────────────────────

INSERT INTO templates (id, workspace, name, category, prompt_text, negative_prompt, aspect_ratio, style_preset, usage_count, created_at, updated_at) VALUES
(
  'tpl-vn-001', 'vietnoms', 'Kiosk Beverage — Hero Shot', 'beverage',
  'Professional product photography of a Vietnamese {beverage_name}, centered on a clean white surface with soft diffused lighting from the upper left, slight condensation on the cup, garnished with {garnish}. Shot from a 30-degree elevated angle. Crisp, appetizing, restaurant menu quality. 4K detail.',
  '', '4:5', 'product-photo-clean', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-vn-002', 'vietnoms', 'Kiosk Entree — Overhead', 'entree',
  'Overhead flat-lay food photography of {dish_name} in a modern bowl on a light wood surface. Vietnamese herbs and lime wedge garnish visible. Natural window lighting from the left. Steam slightly visible. Professional restaurant menu quality.',
  '', '1:1', 'product-photo-overhead', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-vn-003', 'vietnoms', 'Kiosk Banner — Promo', 'promo',
  'Wide promotional banner for a Vietnamese restaurant featuring {promo_item}. Modern, clean design with the text ''{promo_text}'' rendered clearly. Vibrant but not overwhelming colors. Digital menu board format.',
  '', '16:9', 'promo-banner', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-vn-004', 'vietnoms', 'Beverage Lineup — Side by Side', 'beverage',
  'Professional product photography lineup of {count} Vietnamese beverages side by side on a clean white surface. Consistent lighting across all drinks. Each drink is clearly distinct. Studio product photography style for a digital kiosk menu.',
  '', '16:9', 'product-photo-lineup', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-lm-001', 'lumination', 'Character Archetype Card', 'character',
  'Anime-style character portrait of a {archetype} archetype — a {age_range} year old {description}. Dynamic pose showing inner strength. Vibrant color palette with {color_theme} tones. Semi-realistic anime art style. Suitable as a collectible card illustration. High detail, clean linework.',
  '', '4:5', 'anime-character-card', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-lm-002', 'lumination', 'Hero Journey Scene', 'scene',
  'Cinematic anime scene depicting the ''{journey_stage}'' stage of the hero''s journey. A young protagonist {action_description}. Epic lighting with {mood} atmosphere. Wide shot showing environment and character. Anime film quality.',
  '', '16:9', 'anime-cinematic', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-lm-003', 'lumination', 'Social Media — Quote Card', 'social',
  'Inspirational quote card for Instagram with the text: ''{quote_text}''. Anime-inspired background with subtle {element} motifs. Clean typography, easily readable. Brand colors: deep purple and gold accents. Modern, aspirational design appealing to teens and young adults.',
  '', '1:1', 'social-quote', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
),
(
  'tpl-lm-004', 'lumination', 'Lore Drop Thumbnail', 'content',
  'YouTube/social media thumbnail featuring an anime-style {character_type} with an intense expression. Bold text area reserved on the right side. Dynamic action lines in the background. Eye-catching, high contrast, designed to grab attention in a feed.',
  '', '16:9', 'thumbnail-bold', 0, '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
