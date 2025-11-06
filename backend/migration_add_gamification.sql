-- Migration: Add Gamification Features (Rewards & Achievements)
-- Run this on your Render PostgreSQL database

-- Step 1: Add points column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Step 2: Create achievement table
CREATE TABLE IF NOT EXISTS achievement (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    criteria_type VARCHAR(50) NOT NULL,
    criteria_value INTEGER NOT NULL
);

-- Step 3: Create user_achievement table
CREATE TABLE IF NOT EXISTS user_achievement (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievement(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Insert default achievements (only if they don't exist)
INSERT INTO achievement (name, description, icon, criteria_type, criteria_value) 
VALUES
    ('Road Warrior', 'Complete your first trip', '🛣️', 'first_trip', 1),
    ('Guardian Angel', 'Complete 5 trips with 0 alerts', '👼', 'zero_alerts', 5),
    ('Long Hauler', 'Drive for 2+ hours in one trip', '🚛', 'long_trip', 7200),
    ('Weekly Champion', 'Complete 7 trips in 7 days', '🏆', 'weekly_trips', 7),
    ('Centurion', 'Reach 100 total trips', '💯', 'total_trips', 100),
    ('Eagle Eye', 'Complete 10 consecutive trips with 0 alerts', '🦅', 'consecutive_zero_alerts', 10),
    ('Perfect Score', 'Achieve 100 safety score 5 times', '⭐', 'perfect_scores', 5)
ON CONFLICT (name) DO NOTHING;

-- Step 5: Set existing users' points to 0 (if any exist)
UPDATE "user" SET points = 0 WHERE points IS NULL;

-- Verification queries (run these to verify the migration worked)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'points';
-- SELECT COUNT(*) FROM achievement;
-- SELECT * FROM achievement;
