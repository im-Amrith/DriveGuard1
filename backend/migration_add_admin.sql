-- Add is_admin and created_at columns to user table
ALTER TABLE user ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE user ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create an admin user (password: admin123)
-- You can change this after first login
INSERT INTO user (email, password, points, is_admin, created_at)
VALUES ('admin@driveguard.com', 'scrypt:32768:8:1$YourHashHere$...', 0, TRUE, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Note: The password hash above needs to be generated properly
-- Run this Python script to create the admin user:
