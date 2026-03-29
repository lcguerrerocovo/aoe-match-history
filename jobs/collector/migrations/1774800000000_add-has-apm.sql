-- Add has_apm column to track which matches have APM analysis data
ALTER TABLE match ADD COLUMN has_apm BOOLEAN NOT NULL DEFAULT FALSE;
