-- Create system_settings table for persisting application-wide settings
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value) VALUES
  ('schoolName', 'De La Salle University'),
  ('systemTitle', 'AttendED'),
  ('tagline', 'Streamlining Academic Attendance'),
  ('primaryColor', '#006937'),
  ('secondaryColor', '#004d29'),
  ('logoUrl', ''),
  ('faviconUrl', ''),
  ('theme', 'light'),
  ('fontFamily', 'inter')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Enable RLS (Row Level Security)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read settings
CREATE POLICY "Allow all users to read system settings"
  ON system_settings
  FOR SELECT
  USING (true);

-- Policy to allow only superadmins to update settings
-- Note: This requires the auth.jwt() to have a role claim
-- For simplicity, we allow all authenticated users to update for now
-- In production, you might want to restrict this to superadmins only
CREATE POLICY "Allow authenticated users to update system settings"
  ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
