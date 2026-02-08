-- Paint Changes Table for Logging All Paint Operations
-- Run this in Supabase SQL Editor before deploying Edge Functions

-- Create paint_changes table
CREATE TABLE IF NOT EXISTS paint_changes (
    id BIGSERIAL PRIMARY KEY,
    ml_code TEXT NOT NULL,
    old_weight NUMERIC,        -- NULL for new paints (0 → initial weight)
    new_weight NUMERIC NOT NULL,
    gamintojas TEXT,
    kodas TEXT,
    spalva TEXT,
    gruntas TEXT,
    blizgumas TEXT,
    pavirsus TEXT,
    effect TEXT,
    sudetis TEXT,
    kaina NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_paint_changes_ml_code ON paint_changes(ml_code);
CREATE INDEX IF NOT EXISTS idx_paint_changes_created_at ON paint_changes(created_at DESC);

-- Optional: Enable Row Level Security (if needed)
-- ALTER TABLE paint_changes ENABLE ROW LEVEL SECURITY;

-- Optional: RLS Policy to allow all operations (adjust based on your needs)
-- CREATE POLICY "Allow all operations on paint_changes" ON paint_changes
--     FOR ALL USING (true);

-- Test query to verify table creation
SELECT * FROM paint_changes LIMIT 1;

-- Success message
SELECT 'paint_changes table created successfully!' as status;
