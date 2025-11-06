"""
Migration Script: Add Gamification Features
Run this script to update the PostgreSQL database with new tables and columns
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
database_url = os.environ.get('DATABASE_URL')
if database_url:
    database_url = database_url.replace("postgres://", "postgresql://", 1)

print("🔄 Connecting to database...")
print(f"Database: {database_url.split('@')[1].split('/')[1]}")

try:
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    print("\n📝 Step 1: Adding 'points' column to user table...")
    cursor.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;')
    print("✅ Points column added")
    
    print("\n📝 Step 2: Creating 'achievement' table...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS achievement (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description VARCHAR(200) NOT NULL,
            icon VARCHAR(50) NOT NULL,
            criteria_type VARCHAR(50) NOT NULL,
            criteria_value INTEGER NOT NULL
        );
    ''')
    print("✅ Achievement table created")
    
    print("\n📝 Step 3: Creating 'user_achievement' table...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_achievement (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            achievement_id INTEGER NOT NULL REFERENCES achievement(id),
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    print("✅ User_achievement table created")
    
    print("\n📝 Step 4: Inserting default achievements...")
    achievements = [
        ('Road Warrior', 'Complete your first trip', '🛣️', 'first_trip', 1),
        ('Guardian Angel', 'Complete 5 trips with 0 alerts', '👼', 'zero_alerts', 5),
        ('Long Hauler', 'Drive for 2+ hours in one trip', '🚛', 'long_trip', 7200),
        ('Weekly Champion', 'Complete 7 trips in 7 days', '🏆', 'weekly_trips', 7),
        ('Centurion', 'Reach 100 total trips', '💯', 'total_trips', 100),
        ('Eagle Eye', 'Complete 10 consecutive trips with 0 alerts', '🦅', 'consecutive_zero_alerts', 10),
        ('Perfect Score', 'Achieve 100 safety score 5 times', '⭐', 'perfect_scores', 5)
    ]
    
    for achievement in achievements:
        try:
            cursor.execute('''
                INSERT INTO achievement (name, description, icon, criteria_type, criteria_value) 
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING;
            ''', achievement)
        except Exception as e:
            print(f"⚠️  Achievement '{achievement[0]}' might already exist")
    
    print("✅ Achievements inserted")
    
    print("\n📝 Step 5: Updating existing users...")
    cursor.execute('UPDATE "user" SET points = 0 WHERE points IS NULL;')
    print("✅ User points initialized")
    
    # Verify
    print("\n🔍 Verifying migration...")
    cursor.execute("SELECT COUNT(*) FROM achievement;")
    achievement_count = cursor.fetchone()[0]
    print(f"✅ Found {achievement_count} achievements in database")
    
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'points';")
    if cursor.fetchone():
        print("✅ Points column exists in user table")
    
    conn.commit()
    print("\n🎉 Migration completed successfully!")
    print("\n💡 Next step: Restart your Flask server with 'flask run'")
    
except Exception as e:
    print(f"\n❌ Error during migration: {e}")
    conn.rollback()
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
