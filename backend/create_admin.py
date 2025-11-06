from app import app, db, User
from werkzeug.security import generate_password_hash
from sqlalchemy import text


def ensure_user_columns():
    """Ensure the User table has is_admin and created_at columns.
    This function uses the actual table name from the model so it works whether the table
    is named 'user' or 'users'. It works for PostgreSQL and SQLite.
    """
    with app.app_context():
        table_name = User.__table__.name
        inspector = db.engine.execute

        # Detect dialect
        dialect = db.engine.dialect.name

        try:
            if dialect == 'sqlite':
                # Use PRAGMA to inspect columns
                cols = [r[1] for r in db.session.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()]
                if 'is_admin' not in cols:
                    db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
                    print("✅ Added is_admin column (sqlite)")
                else:
                    print("ℹ️  is_admin column already exists (sqlite)")

                if 'created_at' not in cols:
                    db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    print("✅ Added created_at column (sqlite)")
                else:
                    print("ℹ️  created_at column already exists (sqlite)")

            else:
                # Assume PostgreSQL-compatible
                # Check is_admin
                result = db.session.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='is_admin'"), {'t': table_name})
                if result.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE'))
                    print("✅ Added is_admin column (postgres)")
                else:
                    print("ℹ️  is_admin column already exists (postgres)")

                # Check created_at
                result = db.session.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name=:t AND column_name='created_at'"), {'t': table_name})
                if result.fetchone() is None:
                    db.session.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'))
                    print("✅ Added created_at column (postgres)")
                else:
                    print("ℹ️  created_at column already exists (postgres)")

            db.session.commit()
        except Exception as e:
            print(f"❌ Error ensuring user columns: {e}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    # Run migration steps first
    ensure_user_columns()

    # Create admin user
    admin_email = 'admin@driveguard.com'
    admin_password = 'admin123'  # Change this after first login!

    with app.app_context():
        existing_admin = User.query.filter_by(email=admin_email).first()

        if existing_admin:
            # Update existing user to admin
            existing_admin.is_admin = True
            db.session.commit()
            print(f"✅ Updated {admin_email} to admin")
        else:
            # Create new admin user
            admin_user = User(
                email=admin_email,
                password=generate_password_hash(admin_password),
                points=0,
                is_admin=True
            )
            db.session.add(admin_user)
            db.session.commit()
            print(f"✅ Admin user created:")
            print(f"   Email: {admin_email}")
            print(f"   Password: {admin_password}")
            print(f"   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!")

        # Show all admin users
        admins = User.query.filter_by(is_admin=True).all()
        print(f"\n👑 Admin users ({len(admins)}):")
        for admin in admins:
            print(f"   - {admin.email} (ID: {admin.id})")
