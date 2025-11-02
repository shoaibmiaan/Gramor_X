#!/bin/bash
# Enhanced Full Migration Audit for Gramor_X
# Run from project root

DB_CONTAINER="gramorx-db"
DB_USER="gramorx"
DB_NAME="gramorx"

FAILED_FILES=()

echo "======================"
echo "0️⃣  Check Docker container"
echo "======================"
docker exec $DB_CONTAINER pg_isready -U $DB_USER
if [ $? -ne 0 ]; then
    echo "❌ ERROR: PostgreSQL container not ready"
    exit 1
fi

echo ""
echo "======================"
echo "1️⃣  List all migrations in order"
echo "======================"
ls -1 supabase/migrations/*.sql | sort

echo ""
echo "======================"
echo "2️⃣  Check for duplicate filenames"
echo "======================"
DUP_FILES=$(ls -1 supabase/migrations/*.sql | xargs -n1 basename | sort | uniq -d)
if [ -n "$DUP_FILES" ]; then
    echo "❌ Duplicate filenames found:"
    echo "$DUP_FILES"
else
    echo "✅ No duplicate filenames"
fi

echo ""
echo "======================"
echo "3️⃣  Check for duplicate table creations"
echo "======================"
DUP_TABLES=$(grep -iH "CREATE TABLE" supabase/migrations/*.sql | \
sed -E 's/.*CREATE TABLE IF NOT EXISTS ([^ (]+).*/\1 \(\0\)/I' | sort | uniq -d)
if [ -n "$DUP_TABLES" ]; then
    echo "❌ Duplicate tables found:"
    echo "$DUP_TABLES"
else
    echo "✅ No duplicate table creations"
fi

echo ""
echo "======================"
echo "4️⃣  Check for duplicate index creations"
echo "======================"
DUP_INDEXES=$(grep -iH "CREATE INDEX" supabase/migrations/*.sql | \
sed -E 's/.*CREATE INDEX ([^ (]+).*/\1 \(\0\)/I' | sort | uniq -d)
if [ -n "$DUP_INDEXES" ]; then
    echo "❌ Duplicate indexes found:"
    echo "$DUP_INDEXES"
else
    echo "✅ No duplicate index creations"
fi

echo ""
echo "======================"
echo "5️⃣  Syntax check (dry-run on local DB)"
echo "======================"

for f in supabase/migrations/*.sql; do
    echo "----------------------"
    echo "Checking $f"
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME --set ON_ERROR_STOP=on < "$f"
    if [ $? -ne 0 ]; then
        echo "❌ ERROR in $f"
        FAILED_FILES+=("$f")
    else
        echo "✅ $f OK"
    fi
done

echo ""
echo "======================"
echo "Audit Summary"
echo "======================"
if [ ${#FAILED_FILES[@]} -eq 0 ]; then
    echo "🎉 All migrations passed!"
else
    echo "⚠️  The following migrations failed:"
    for f in "${FAILED_FILES[@]}"; do
        echo "   - $f"
    done
fi

echo ""
echo "======================"
echo "Audit Complete"
echo "======================"
