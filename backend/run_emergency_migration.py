"""
Migration Script: Add Emergency Contact Feature
Run this script to update the PostgreSQL database with emergency contact table
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
    
    print("\n📝 Step 1: Creating 'emergency_contact' table...")
    cursor.execute('''
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
    ''')
    print("✅ Emergency_contact table created")
    
    print("\n📝 Step 2: Creating index for performance...")
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_emergency_contact_user_id ON emergency_contact(user_id);
    ''')
    print("✅ Index created")
    
    # Verify
    print("\n🔍 Verifying migration...")
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'emergency_contact';")
    columns = cursor.fetchall()
    print(f"✅ Emergency_contact table has {len(columns)} columns: {[col[0] for col in columns]}")
    
    conn.commit()
    print("\n🎉 Migration completed successfully!")
    print("\n💡 Next steps:")
    print("   1. Install SendGrid: pip install sendgrid")
    print("   2. Add SENDGRID_API_KEY to your .env file")
    print("   3. Add SENDGRID_SENDER_EMAIL to your .env file")
    print("   4. Restart your Flask server with 'flask run'")
    
except Exception as e:
    print(f"\n❌ Error during migration: {e}")
    conn.rollback()
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
