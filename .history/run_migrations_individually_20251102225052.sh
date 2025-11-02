#!/bin/bash
set -e

# --- CONFIG ---
# Change these if your local Supabase DB uses different credentials
DB_HOST="localhost"
DB_PORT="54322"
DB_USER="postgres"
DB_NAME="postgres"
MIGRATIONS_DIR="supabase/migrations"

# --- SCRIPT ---
echo "Starting individual migration run..."
for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    echo "--------------------------------------------------"
    echo "Applying migration: $file"
    psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" -f "$file"
    if [ $? -eq 0 ]; then
        echo "✅ Successfully applied: $file"
    else
        echo "❌ Error applying: $file"
        exit 1
    fi
done
echo "--------------------------------------------------"
echo "All migrations applied successfully!"
