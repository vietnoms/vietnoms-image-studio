-- 003_template_builder.sql
-- Add premium flag and source image URL to templates table
-- for screenshot-to-template feature and premium template tiers.

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_image_url TEXT DEFAULT '';
