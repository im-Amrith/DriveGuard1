"""
Enhanced Gamification Migration Script
Creates tables and seeds initial data for:
- Badges (Night Owl, Marathon Driver, etc.)
- Challenges (weekly, daily challenges)
- Store Items (rewards to redeem)
- User Streaks
"""
from app import app, db
from sqlalchemy import text
import sys

def run_migration():
    with app.app_context():
        dialect = db.engine.dialect.name
        
        try:
            print("🔄 Creating gamification tables...")
            
            # Create Badge table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS badge (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(100) UNIQUE NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        icon VARCHAR(50) NOT NULL,
                        criteria_type VARCHAR(50) NOT NULL,
                        criteria_value INTEGER NOT NULL,
                        points_reward INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS badge (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) UNIQUE NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        icon VARCHAR(50) NOT NULL,
                        criteria_type VARCHAR(50) NOT NULL,
                        criteria_value INTEGER NOT NULL,
                        points_reward INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            print("✅ Badge table created")
            
            # Create UserBadge table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_badge (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        badge_id INTEGER NOT NULL,
                        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
                        FOREIGN KEY (badge_id) REFERENCES badge(id)
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_badge (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                        badge_id INTEGER NOT NULL REFERENCES badge(id),
                        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            print("✅ UserBadge table created")
            
            # Create Challenge table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS challenge (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(100) NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        challenge_type VARCHAR(50) NOT NULL,
                        criteria_type VARCHAR(50) NOT NULL,
                        criteria_value INTEGER NOT NULL,
                        points_reward INTEGER NOT NULL,
                        start_date TIMESTAMP NOT NULL,
                        end_date TIMESTAMP NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS challenge (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        challenge_type VARCHAR(50) NOT NULL,
                        criteria_type VARCHAR(50) NOT NULL,
                        criteria_value INTEGER NOT NULL,
                        points_reward INTEGER NOT NULL,
                        start_date TIMESTAMP NOT NULL,
                        end_date TIMESTAMP NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            print("✅ Challenge table created")
            
            # Create UserChallenge table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_challenge (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        challenge_id INTEGER NOT NULL,
                        progress INTEGER DEFAULT 0,
                        completed BOOLEAN DEFAULT 0,
                        completed_at TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
                        FOREIGN KEY (challenge_id) REFERENCES challenge(id)
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_challenge (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                        challenge_id INTEGER NOT NULL REFERENCES challenge(id),
                        progress INTEGER DEFAULT 0,
                        completed BOOLEAN DEFAULT FALSE,
                        completed_at TIMESTAMP
                    )
                '''))
            print("✅ UserChallenge table created")
            
            # Create StoreItem table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS store_item (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(100) NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        icon VARCHAR(50) NOT NULL,
                        points_cost INTEGER NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        stock INTEGER DEFAULT -1,
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS store_item (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        description VARCHAR(200) NOT NULL,
                        icon VARCHAR(50) NOT NULL,
                        points_cost INTEGER NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        stock INTEGER DEFAULT -1,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            print("✅ StoreItem table created")
            
            # Create Redemption table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS redemption (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        store_item_id INTEGER NOT NULL,
                        points_spent INTEGER NOT NULL,
                        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) DEFAULT 'pending',
                        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
                        FOREIGN KEY (store_item_id) REFERENCES store_item(id)
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS redemption (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                        store_item_id INTEGER NOT NULL REFERENCES store_item(id),
                        points_spent INTEGER NOT NULL,
                        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(20) DEFAULT 'pending'
                    )
                '''))
            print("✅ Redemption table created")
            
            # Create UserStreak table
            if dialect == 'sqlite':
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_streak (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER UNIQUE NOT NULL,
                        current_streak INTEGER DEFAULT 0,
                        longest_streak INTEGER DEFAULT 0,
                        last_trip_date DATE,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
                    )
                '''))
            else:
                db.session.execute(text('''
                    CREATE TABLE IF NOT EXISTS user_streak (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                        current_streak INTEGER DEFAULT 0,
                        longest_streak INTEGER DEFAULT 0,
                        last_trip_date DATE,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
            print("✅ UserStreak table created")
            
            db.session.commit()
            print("\n✅ All gamification tables created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            db.session.rollback()
            sys.exit(1)

def seed_initial_data():
    with app.app_context():
        try:
            print("\n🌱 Seeding initial gamification data...")
            
            # Check if badges already exist
            result = db.session.execute(text("SELECT COUNT(*) FROM badge"))
            badge_count = result.scalar()
            
            if badge_count == 0:
                print("📝 Adding badges...")
                badges = [
                    ('Night Owl', 'Complete 5 safe trips between 10 PM - 5 AM', '🦉', 'night_trips', 5, 50),
                    ('Marathon Driver', 'Complete a trip longer than 3 hours with perfect safety', '🏃', 'long_safe_trip', 10800, 100),
                    ('Zero Hero', 'Complete 10 trips with zero alerts', '🦸', 'zero_alert_trips', 10, 75),
                    ('Early Bird', 'Complete 5 trips between 5 AM - 8 AM', '🐦', 'morning_trips', 5, 50),
                    ('Streak Master', 'Maintain a 30-day driving streak', '🔥', 'streak_days', 30, 150),
                    ('Safety Champion', 'Achieve 95+ safety score on 20 trips', '🛡️', 'high_safety_trips', 20, 200),
                ]
                
                for badge in badges:
                    db.session.execute(text('''
                        INSERT INTO badge (name, description, icon, criteria_type, criteria_value, points_reward, is_active)
                        VALUES (:name, :desc, :icon, :criteria_type, :criteria_value, :points, TRUE)
                    '''), {
                        'name': badge[0],
                        'desc': badge[1],
                        'icon': badge[2],
                        'criteria_type': badge[3],
                        'criteria_value': badge[4],
                        'points': badge[5]
                    })
                print(f"✅ Added {len(badges)} badges")
            else:
                print(f"ℹ️  {badge_count} badges already exist")
            
            # Check if store items already exist
            result = db.session.execute(text("SELECT COUNT(*) FROM store_item"))
            item_count = result.scalar()
            
            if item_count == 0:
                print("📝 Adding store items...")
                store_items = [
                    ('Premium Dashboard Theme', 'Unlock exclusive dark mode theme', '🎨', 500, 'cosmetic'),
                    ('Extended Analytics', '30 days of detailed trip analytics', '📊', 1000, 'feature'),
                    ('Priority Support', '24/7 priority customer support for 1 month', '💬', 750, 'feature'),
                    ('Gift Card $10', 'Amazon gift card worth $10', '🎁', 2000, 'discount'),
                    ('Custom Alert Sounds', 'Personalize your alert notifications', '🔔', 300, 'cosmetic'),
                    ('Safety Certificate', 'Digital safe driving certificate', '📜', 1500, 'discount'),
                ]
                
                for item in store_items:
                    db.session.execute(text('''
                        INSERT INTO store_item (name, description, icon, points_cost, category, stock, is_active)
                        VALUES (:name, :desc, :icon, :cost, :category, -1, TRUE)
                    '''), {
                        'name': item[0],
                        'desc': item[1],
                        'icon': item[2],
                        'cost': item[3],
                        'category': item[4]
                    })
                print(f"✅ Added {len(store_items)} store items")
            else:
                print(f"ℹ️  {item_count} store items already exist")
            
            # Check if challenges already exist
            result = db.session.execute(text("SELECT COUNT(*) FROM challenge"))
            challenge_count = result.scalar()
            
            if challenge_count == 0:
                print("📝 Adding challenges...")
                from datetime import datetime, timedelta
                
                now = datetime.utcnow()
                week_end = now + timedelta(days=7)
                
                challenges = [
                    ('Weekly Zero Alert Challenge', 'Complete 5 trips with 0 alerts this week', 'weekly', 'zero_alert_trips', 5, 200, now, week_end),
                    ('Daily Driver', 'Complete at least 1 trip today', 'daily', 'daily_trip', 1, 50, now, now + timedelta(days=1)),
                    ('Perfect Week', 'Maintain 90+ safety score for 7 consecutive days', 'weekly', 'high_safety_streak', 7, 300, now, week_end),
                ]
                
                for challenge in challenges:
                    db.session.execute(text('''
                        INSERT INTO challenge (name, description, challenge_type, criteria_type, criteria_value, points_reward, start_date, end_date, is_active)
                        VALUES (:name, :desc, :type, :criteria_type, :criteria_value, :points, :start, :end, TRUE)
                    '''), {
                        'name': challenge[0],
                        'desc': challenge[1],
                        'type': challenge[2],
                        'criteria_type': challenge[3],
                        'criteria_value': challenge[4],
                        'points': challenge[5],
                        'start': challenge[6],
                        'end': challenge[7]
                    })
                print(f"✅ Added {len(challenges)} challenges")
            else:
                print(f"ℹ️  {challenge_count} challenges already exist")
            
            db.session.commit()
            print("\n🎉 Initial gamification data seeded successfully!")
            
        except Exception as e:
            print(f"❌ Error seeding data: {e}")
            db.session.rollback()
            sys.exit(1)

if __name__ == '__main__':
    print("=" * 60)
    print("Enhanced Gamification Migration")
    print("=" * 60)
    run_migration()
    seed_initial_data()
    print("\n✅ Migration complete! Restart your Flask server.")
    print("=" * 60)
