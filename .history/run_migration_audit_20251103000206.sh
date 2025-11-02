#!/bin/bash
# run_migration_audit.sh
# Runs all SQL migrations and creates a full report + failures summary.

# ----------------------------
# Config
# ----------------------------
FULL_REPORT="./migration_audit_full_report.txt"
FAILURE_SUMMARY="./migration_audit_failures_summary.txt"
MIGRATIONS_DIR="./supabase/migrations"
DB_URL="postgresql://gramorx:secret@localhost:5432/gramorx-db"

# Clear previous reports
> "$FULL_REPORT"
> "$FAILURE_SUMMARY"

echo "Starting migration audit at: $(date)" | tee -a "$FULL_REPORT"

# ----------------------------
# Run migrations
# ----------------------------
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [[ -f "$migration" ]]; then
        echo "Running migration: $migration" | tee -a "$FULL_REPORT"
        psql "$DB_URL" -f "$migration" >> "$FULL_REPORT" 2>&1
        if [[ $? -ne 0 ]]; then
            echo "❌ ERROR running migration: $migration" | tee -a "$FULL_REPORT" "$FAILURE_SUMMARY"
        fi
    else
        echo "No migration files found in $MIGRATIONS_DIR"
    fi
done

# ----------------------------
# Summary stats
# ----------------------------
TOTAL_MIGRATIONS=$(grep -c "Running migration" "$FULL_REPORT")
FAILED_MIGRATIONS=$(grep -c "❌ ERROR" "$FULL_REPORT")

echo "" >> "$FAILURE_SUMMARY"
echo "Total migrations checked: $TOTAL_MIGRATIONS" >> "$FAILURE_SUMMARY"
echo "Total failed migrations: $FAILED_MIGRATIONS" >> "$FAILURE_SUMMARY"

echo "Migration audit completed at: $(date)" | tee -a "$FULL_REPORT" "$FAILURE_SUMMARY"

echo "✅ Full report: $FULL_REPORT"
echo "❌ Failures summary: $FAILURE_SUMMARY"
