-- Vietnoms Image Studio — Initial Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Organizations (restaurants/businesses)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'starter', 'pro', 'agency')),
  stripe_customer_id TEXT,
  credits_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with org membership
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (org_id, user_id)
);

-- Brand profiles (the key differentiator)
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cuisine_type TEXT,
  color_primary TEXT,
  color_secondary TEXT,
  color_accent TEXT,
  font_heading TEXT,
  font_body TEXT,
  style_keywords TEXT[] DEFAULT '{}',
  lighting_preference TEXT,
  background_preference TEXT,
  system_prompt TEXT,
  reference_images TEXT[] DEFAULT '{}',
  logo_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt templates with brand-specific defaults
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  brand_profile_id UUID REFERENCES brand_profiles(id),
  name TEXT NOT NULL,
  category TEXT,
  asset_type TEXT DEFAULT 'photo_generate',
  prompt_text TEXT NOT NULL,
  negative_prompt TEXT DEFAULT '',
  aspect_ratio TEXT DEFAULT '1:1',
  style_preset TEXT DEFAULT '',
  variable_schema JSONB DEFAULT '[]',
  thumbnail_path TEXT,
  is_marketplace BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated images with full provenance
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  brand_profile_id UUID REFERENCES brand_profiles(id),
  template_id UUID REFERENCES templates(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  prompt_text TEXT NOT NULL,
  negative_prompt TEXT DEFAULT '',
  aspect_ratio TEXT,
  model TEXT DEFAULT 'gemini-2.0-flash-preview-image-generation',
  generation_params JSONB DEFAULT '{}',
  source_image_path TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'archived')),
  is_favorite BOOLEAN DEFAULT FALSE,
  is_upscaled BOOLEAN DEFAULT FALSE,
  parent_image_id UUID REFERENCES images(id),
  credits_consumed INTEGER DEFAULT 1,
  cost_estimate REAL,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tagging system for organization
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(org_id, name)
);

CREATE TABLE image_tags (
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

-- Generation sessions for batch tracking
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT,
  brand_profile_id UUID REFERENCES brand_profiles(id),
  total_generated INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit transactions (audit trail)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  stripe_payment_id TEXT,
  image_id UUID REFERENCES images(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_images_org ON images(org_id);
CREATE INDEX idx_images_status ON images(org_id, status);
CREATE INDEX idx_images_brand ON images(brand_profile_id);
CREATE INDEX idx_templates_org ON templates(org_id);
CREATE INDEX idx_templates_marketplace ON templates(is_marketplace) WHERE is_marketplace = TRUE;
CREATE INDEX idx_credit_tx_org ON credit_transactions(org_id);
CREATE INDEX idx_brand_profiles_org ON brand_profiles(org_id);
