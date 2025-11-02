#!/bin/bash

# Files to store reports
FULL_REPORT="migration_audit_full_report.txt"
FAILURE_SUMMARY="migration_audit_failures.txt"

# Clear previous reports
> "$FULL_REPORT"
> "$FAILURE_SUMMARY"

echo "Starting migration audit at $(date)" | tee -a "$FULL_REPORT"

# Loop over all migration files
for MIGRATION in supabase/migrations/*.sql; do
    echo "----------------------" | tee -a "$FULL_REPORT"
    echo "Checking $MIGRATION" | tee -a "$FULL_REPORT"

    # Run the migration in dry-run mode or catch errors
    if psql -f "$MIGRATION" 2>> "$FULL_REPORT"; then
        echo "✅ $MIGRATION OK" | tee -a "$FULL_REPORT"
    else
        echo "❌ ERROR in $MIGRATION" | tee -a "$FULL_REPORT"
        grep -C 3 "ERROR" "$FULL_REPORT" >> "$FAILURE_SUMMARY"
    fi
done

# Summary stats
TOTAL_MIGRATIONS=$(ls supabase/migrations/*.sql | wc -l)
FAILED_MIGRATIONS=$(grep -c "❌ ERROR" "$FULL_REPORT")

echo "" >> "$FAILURE_SUMMARY"
echo "Total migrations checked: $TOTAL_MIGRATIONS" >> "$FAILURE_SUMMARY"
echo "Total failed migrations: $FAILED_MIGRATIONS" >> "$FAILURE_SUMMARY"
echo "Migration audit completed at $(date)" | tee -a "$FULL_REPORT"
echo "Migration audit completed at $(date)" >> "$FAILURE_SUMMARY"

echo "✅ Full report: $FULL_REPORT"
echo "❌ Failures summary: $FAILURE_SUMMARY"
