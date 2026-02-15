-- Gallery Images Schema
-- Run this in Supabase SQL Editor

-- Table for gallery images metadata
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT,
  thumbnail_small_path TEXT, -- 200px for mobile
  category TEXT NOT NULL CHECK (category IN ('metalwork', 'furniture', 'automotive', 'industrial')),
  title TEXT,
  description TEXT,
  file_size INTEGER, -- AVIF size in bytes
  original_size INTEGER, -- Original upload size
  width INTEGER,
  height INTEGER,
  thumbnail_width INTEGER DEFAULT 400,
  thumbnail_height INTEGER,
  thumbnail_small_width INTEGER DEFAULT 200,
  thumbnail_small_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_images(created_at DESC);

-- RLS Policies
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for gallery display)
CREATE POLICY "Gallery images are publicly readable"
  ON gallery_images FOR SELECT
  USING (true);

-- Allow authenticated operations (through Edge Function with password)
CREATE POLICY "Gallery images management through service role"
  ON gallery_images FOR ALL
  USING (true);

-- Storage bucket for gallery images
-- Run this separately in Supabase Dashboard > Storage
-- Bucket name: gallery-images
-- Public: Yes (for direct image access)
-- File size limit: 100 MB (for original uploads, will be compressed)
-- Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/avif
