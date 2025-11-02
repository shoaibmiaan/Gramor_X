#!/bin/bash
# run_migration_audit.sh
# Audit all Supabase/Postgres migrations

# =========================
# Config
# =========================
MIGRATIONS_DIR="./supabase/migrations"
FULL_REPORT="migration_audit_full_report.txt"
FAILURE_SUMMARY="migration_failures_summary.txt"

# Clear previous reports
> "$FULL_REPORT"
> "$FAILURE_SUMMARY"

echo "===============================" >> "$FULL_REPORT"
echo "Migration Audit Started: $(date)" >> "$FULL_REPORT"
echo "===============================" >> "$FULL_REPORT"
echo "" >> "$FULL_REPORT"

# =========================
# Loop through each migration
# =========================
for migration in "$MIGRATIONS_DIR"/*.sql; do
    echo "----------------------" >> "$FULL_REPORT"
    echo "Checking $migration" >> "$FULL_REPORT"
    echo "----------------------" >> "$FULL_REPORT"

    # Run migration using psql
    psql "postgresql://gramorx:secret@localhost:5432/gramorx-db" -f "$migration" &>> "$FULL_REPORT"
    
    if grep -q "ERROR" <<< "$(tail -n 20 "$FULL_REPORT")"; then
        echo "❌ ERROR in $migration" >> "$FULL_REPORT"
        echo "" >> "$FAILURE_SUMMARY"
        echo "----------------------" >> "$FAILURE_SUMMARY"
        tail -n 20 "$FULL_REPORT" | grep -C 3 "ERROR" >> "$FAILURE_SUMMARY"
    else
        echo "✅ $migration OK" >> "$FULL_REPORT"
    fi
done

# =========================
# Summary stats
# =========================
TOTAL_MIGRATIONS=$(ls "$MIGRATIONS_DIR"/*.sql | wc -l)
FAILED_MIGRATIONS=$(grep -c "❌ ERROR" "$FULL_REPORT")

echo "" >> "$FAILURE_SUMMARY"
echo "===============================" >> "$FAILURE_SUMMARY"
echo "Migration Audit Summary" >> "$FAILURE_SUMMARY"
echo "-------------------------------" >> "$FAILURE_SUMMARY"
echo "Total migrations checked: $TOTAL_MIGRATIONS" >> "$FAILURE_SUMMARY"
echo "Total failed migrations: $FAILED_MIGRATIONS" >> "$FAILURE_SUMMARY"
echo "Audit completed at: $(date)" >> "$FAILURE_SUMMARY"

echo "===============================" >> "$FULL_REPORT"
echo "Migration Audit Completed: $(date)" >> "$FULL_REPORT"
echo "===============================" >> "$FULL_REPORT"

echo "✅ Full report: $FULL_REPORT"
echo "❌ Failures summary: $FAILURE_SUMMARY"
