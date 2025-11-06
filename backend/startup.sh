#!/bin/bash

# Startup script for Render deployment
# This runs the migration and then starts the Flask app

echo "🚀 Starting backend deployment..."

# Run database migration
echo "📦 Running database migration..."
python migration_add_gamification_enhanced.py

# Check migration exit code
if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "⚠️ Migration had issues, but continuing to start app..."
fi

# Start the Flask application
echo "🔥 Starting Flask application..."
gunicorn --bind 0.0.0.0:$PORT app:app
