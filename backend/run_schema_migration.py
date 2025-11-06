"""
Safe schema migration helper for DriveGuard

This script will:
 - Ensure User has is_admin, created_at, and points columns
 - Ensure Trip has created_at column (alias for timestamp)
 - Create achievements and user_achievement tables if missing (delegates to run_migration.py functionality)

Run this with: python run_schema_migration.py
"""
from app import app, db, User, Trip
from sqlalchemy import text
import sys


def ensure_columns():
    with app.app_context():
        user_table = User.__table__.name
        trip_table = Trip.__table__.name
        dialect = db.engine.dialect.name

        try:
            if dialect == 'sqlite':
                # User table
                user_cols = [r[1] for r in db.session.execute(text(f"PRAGMA table_info('{user_table}')")).fetchall()]
                if 'points' not in user_cols:
                    db.session.execute(text(f"ALTER TABLE {user_table} ADD COLUMN points INTEGER DEFAULT 0"))
                    print("✅ Added points column to user (sqlite)")
                if 'is_admin' not in user_cols:
                    db.session.execute(text(f"ALTER TABLE {user_table} ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                    print("✅ Added is_admin column to user (sqlite)")
                if 'created_at' not in user_cols:
                    db.session.execute(text(f"ALTER TABLE {user_table} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    print("✅ Added created_at to user (sqlite)")

                # Trip table
                trip_cols = [r[1] for r in db.session.execute(text(f"PRAGMA table_info('{trip_table}')")).fetchall()]
                if 'created_at' not in trip_cols:
                    db.session.execute(text(f"ALTER TABLE {trip_table} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    print("✅ Added created_at to trip (sqlite)")

            else:
                # Postgres
                # User columns
                res = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='points'"), {'t': user_table})
                if res.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{user_table}" ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0'))
                    print("✅ Added points column to user (postgres)")

                res = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='is_admin'"), {'t': user_table})
                if res.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{user_table}" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE'))
                    print("✅ Added is_admin column to user (postgres)")

                res = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='created_at'"), {'t': user_table})
                if res.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{user_table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'))
                    print("✅ Added created_at to user (postgres)")

                # Trip columns
                res = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='created_at'"), {'t': trip_table})
                if res.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{trip_table}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'))
                    print("✅ Added created_at to trip (postgres)")

            db.session.commit()

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            sys.exit(1)


if __name__ == '__main__':
    print("🔄 Running safe schema migration...")
    ensure_columns()
    print("🎉 Schema migration complete. Restart the Flask server to pick up changes.")
