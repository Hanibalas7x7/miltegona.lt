-- App tokens table for storing and auto-refreshing external API tokens (e.g. eWeLink)
CREATE TABLE IF NOT EXISTS app_tokens (
  id BIGSERIAL PRIMARY KEY,
  service TEXT NOT NULL UNIQUE,         -- e.g. 'ewelink'
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,               -- access token expiry
  rt_expires_at TIMESTAMPTZ,            -- refresh token expiry
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only service role can read/write tokens
ALTER TABLE app_tokens ENABLE ROW LEVEL SECURITY;

-- No public access; edge functions use service role key which bypasses RLS
CREATE POLICY "No public access" ON app_tokens
  FOR ALL USING (false);

-- Insert seed row (update values via dashboard or supabase CLI after deploy)
-- INSERT INTO app_tokens (service, access_token, refresh_token, expires_at)
-- VALUES ('ewelink', '<INITIAL_AT>', '<INITIAL_RT>', NOW() - INTERVAL '1 second');
