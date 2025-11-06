"""
Startup script for Render deployment
Runs migration before starting the Flask app
"""
import subprocess
import sys
import os

def run_migration():
    """Run the gamification migration script"""
    print("🚀 Starting backend deployment...")
    print("📦 Running database migration...")
    
    try:
        # Run migration script
        result = subprocess.run(
            [sys.executable, 'migration_add_gamification_enhanced.py'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(result.stdout)
        
        if result.returncode == 0:
            print("✅ Migration completed successfully!")
        else:
            print(f"⚠️ Migration returned code {result.returncode}")
            print(result.stderr)
            print("Continuing to start app...")
            
    except subprocess.TimeoutExpired:
        print("⚠️ Migration timed out, continuing to start app...")
    except Exception as e:
        print(f"⚠️ Migration error: {e}")
        print("Continuing to start app...")

def start_app():
    """Start the Flask application using gunicorn"""
    print("🔥 Starting Flask application...")
    
    port = os.environ.get('PORT', '10000')
    
    # Start gunicorn
    subprocess.run([
        'gunicorn',
        '--bind', f'0.0.0.0:{port}',
        '--workers', '2',
        '--timeout', '120',
        'app:app'
    ])

if __name__ == '__main__':
    run_migration()
    start_app()
