-- Supabase Database Schema for Gate Control System

-- 1. Control Password Table
CREATE TABLE IF NOT EXISTS control_password (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default password (IMPORTANT: Change this immediately after deployment!)
INSERT INTO control_password (password) VALUES ('CHANGE_THIS_PASSWORD')
ON CONFLICT DO NOTHING;

-- 2. Gate Codes Table
CREATE TABLE IF NOT EXISTS gate_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    unlimited BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster code lookup
CREATE INDEX IF NOT EXISTS idx_gate_codes_code ON gate_codes(code);
CREATE INDEX IF NOT EXISTS idx_gate_codes_validity ON gate_codes(valid_from, valid_to);

-- 3. Gate Commands Table (EXISTING - NO NEED TO CREATE)
-- Table already exists with structure:
-- id, command, user_id, created_at, executed_at, status, response, 
-- phone_number, sms_message, order_code, sms_type, device_id

-- Just add index for order_code if needed
CREATE INDEX IF NOT EXISTS idx_gate_commands_order_code ON gate_commands(order_code);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE control_password ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_codes ENABLE ROW LEVEL SECURITY;
-- gate_commands already exists, check if RLS is needed

-- 5. RLS Policies for control_password (DENY ALL - only Edge Functions can access)
DROP POLICY IF EXISTS "Allow read access to control_password" ON control_password;

CREATE POLICY "Deny all direct access to control_password" ON control_password
    FOR ALL USING (false);

-- 6. RLS Policies for gate_codes (DENY ALL - only Edge Functions can access)
DROP POLICY IF EXISTS "Allow all operations on gate_codes" ON gate_codes;

CREATE POLICY "Deny all direct access to gate_codes" ON gate_codes
    FOR ALL USING (false);

-- Note: Only Service Role Key (used by Edge Functions) can bypass RLS
-- Frontend with ANON_KEY cannot access these tables directly

-- 7. RLS Policies for gate_commands (if needed)
-- CREATE POLICY "Allow all operations on gate_commands" ON gate_commands
--     FOR ALL USING (true);

-- 8. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Triggers for updated_at
DROP TRIGGER IF EXISTS update_control_password_updated_at ON control_password;
DROP TRIGGER IF EXISTS update_gate_codes_updated_at ON gate_codes;

CREATE TRIGGER update_control_password_updated_at
    BEFORE UPDATE ON control_password
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_codes_updated_at
    BEFORE UPDATE ON gate_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Function to clean up old commands (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_commands()
RETURNS void AS $$
BEGIN
    DELETE FROM gate_commands
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND status IN ('completed', 'failed')
    AND order_code IS NOT NULL; -- Only cleanup gate code commands
END;
$$ LANGUAGE plpgsql;

-- Example: Create a scheduled job to run cleanup weekly (using pg_cron extension if available)
-- SELECT cron.schedule('cleanup-old-commands', '0 0 * * 0', 'SELECT cleanup_old_commands()');
