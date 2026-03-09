-- Seed data: Default organization, brand profiles, and starter templates

-- Default organization (your personal org)
INSERT INTO organizations (id, name, slug, plan, credits_remaining)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'My Studio',
  'my-studio',
  'pro',
  9999
);

-- Default user
INSERT INTO users (id, email, name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'owner@studio.local',
  'Studio Owner'
);

INSERT INTO org_members (org_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner'
);

-- Vietnoms brand profile
INSERT INTO brand_profiles (id, org_id, name, cuisine_type, color_primary, color_secondary, style_keywords, lighting_preference, background_preference, system_prompt)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Vietnoms',
  'vietnamese',
  '#F97316',
  '#FEF3C7',
  ARRAY['modern', 'fresh', 'vibrant'],
  'natural',
  'white',
  'You are generating professional product photography for Vietnoms, a Vietnamese fast-casual restaurant. Style guidelines: Clean, well-lit food photography with natural lighting. White or light neutral backgrounds unless specified. Appetizing presentation with Vietnamese culinary aesthetics. Consistent brand feel: modern, fresh, vibrant. Text rendering must be crisp and legible for kiosk displays. Images should look like they belong on a digital menu board.'
);

-- Lumination brand profile
INSERT INTO brand_profiles (id, org_id, name, cuisine_type, color_primary, color_secondary, style_keywords, lighting_preference, background_preference, system_prompt)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Lumination',
  NULL,
  '#7C3AED',
  '#FCD34D',
  ARRAY['anime', 'empowering', 'vibrant', 'aspirational'],
  'dramatic',
  'contextual',
  'You are generating visual assets for Lumination, a youth development community for ages 13-25 that uses anime, video games, and film characters to teach life skills through the hero''s journey framework. Style guidelines: Anime/manga influenced art style with vibrant colors. Empowering, aspirational imagery. Appeal to ages 13-25. Consistent with hero''s journey archetypes. Suitable for social media, presentations, and web content.'
);

-- Vietnoms templates
INSERT INTO templates (org_id, brand_profile_id, name, category, asset_type, prompt_text, aspect_ratio, style_preset) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Kiosk Beverage — Hero Shot',
  'beverage',
  'photo_generate',
  'Professional product photography of a Vietnamese {beverage_name}, centered on a clean white surface with soft diffused lighting from the upper left, slight condensation on the cup, garnished with {garnish}. Shot from a 30-degree elevated angle. Crisp, appetizing, restaurant menu quality. 4K detail.',
  '4:5',
  'product-photo-clean'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Kiosk Entree — Overhead',
  'entree',
  'photo_generate',
  'Overhead flat-lay food photography of {dish_name} in a modern bowl on a light wood surface. Vietnamese herbs and lime wedge garnish visible. Natural window lighting from the left. Steam slightly visible. Professional restaurant menu quality.',
  '1:1',
  'product-photo-overhead'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Kiosk Banner — Promo',
  'promo',
  'photo_generate',
  'Wide promotional banner for a Vietnamese restaurant featuring {promo_item}. Modern, clean design with the text ''{promo_text}'' rendered clearly. Vibrant but not overwhelming colors. Digital menu board format.',
  '16:9',
  'promo-banner'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Beverage Lineup — Side by Side',
  'beverage',
  'photo_generate',
  'Professional product photography lineup of {count} Vietnamese beverages side by side on a clean white surface. Consistent lighting across all drinks. Each drink is clearly distinct. Studio product photography style for a digital kiosk menu.',
  '16:9',
  'product-photo-lineup'
);

-- Lumination templates
INSERT INTO templates (org_id, brand_profile_id, name, category, asset_type, prompt_text, aspect_ratio, style_preset) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'Character Archetype Card',
  'character',
  'photo_generate',
  'Anime-style character portrait of a {archetype} archetype — a {age_range} year old {description}. Dynamic pose showing inner strength. Vibrant color palette with {color_theme} tones. Semi-realistic anime art style. Suitable as a collectible card illustration. High detail, clean linework.',
  '4:5',
  'anime-character-card'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'Hero Journey Scene',
  'scene',
  'photo_generate',
  'Cinematic anime scene depicting the ''{journey_stage}'' stage of the hero''s journey. A young protagonist {action_description}. Epic lighting with {mood} atmosphere. Wide shot showing environment and character. Anime film quality.',
  '16:9',
  'anime-cinematic'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'Social Media — Quote Card',
  'social',
  'photo_generate',
  'Inspirational quote card for Instagram with the text: ''{quote_text}''. Anime-inspired background with subtle {element} motifs. Clean typography, easily readable. Brand colors: deep purple and gold accents. Modern, aspirational design appealing to teens and young adults.',
  '1:1',
  'social-quote'
),
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000011',
  'Lore Drop Thumbnail',
  'content',
  'photo_generate',
  'YouTube/social media thumbnail featuring an anime-style {character_type} with an intense expression. Bold text area reserved on the right side. Dynamic action lines in the background. Eye-catching, high contrast, designed to grab attention in a feed.',
  '16:9',
  'thumbnail-bold'
);
