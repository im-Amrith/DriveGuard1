-- Migration: Add Emergency Contact Feature
-- Run this on your Render PostgreSQL database

-- Step 1: Create emergency_contact table
CREATE TABLE IF NOT EXISTS emergency_contact (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    notification_type VARCHAR(20) NOT NULL DEFAULT 'both',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_contact_user_id ON emergency_contact(user_id);

-- Verification queries (run these to verify the migration worked)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'emergency_contact';
-- SELECT COUNT(*) FROM emergency_contact;
