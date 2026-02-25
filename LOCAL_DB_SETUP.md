# Gramor_X: Local DB & Docker Setup

## 1️⃣ Docker Container

- **Container Name:** `gramorx-db`
- **Image:** `postgres:15`
- **Ports:** `5432:5432` (host → container)
- **Status:** Running (`Up`)
- **CPUs:** 8 available, very low usage during tests (~0.02%)
- **Memory:** ~41MB / 7.48GB

**Command to see running container:**

```bash
docker ps
Command to start container (if not running):
docker run -d \
  --name gramorx-db \
  -e POSTGRES_USER=gramorx \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=gramorx-db \
  -p 5432:5432 \
  postgres:15
2️⃣ Database Connection Details
Key	Value
DB Host	localhost
DB Port	5432
DB Name	gramorx-db
DB User	gramorx
DB Password	secret
Test connection via psql:
psql -h localhost -p 5432 -U gramorx -d gramorx-db
3️⃣ Migrations
Project migrations located in supabase/migrations/.
Example audit run:
./run_migration_audit.sh &> migration_audit_full_report.txt
grep -C 3 "❌ ERROR" migration_audit_full_report.txt > migration_failures_summary.txt
Notes from audit:
Some migrations fail due to missing auth schema or roles (authenticated) locally.
Tables like user_profiles, writing_responses may not exist initially.
Successful migrations include extensions, feature flags, vocab seeding, onboarding fields, etc.
4️⃣ Project Setup for Local Dev
Update .env or config file:
DB_HOST=localhost
DB_PORT=5432
DB_USER=gramorx
DB_PASSWORD=secret
DB_NAME=gramorx-db
Run migrations:
./run_migration_audit.sh
Start development server:
npm run dev
# or
yarn dev
5️⃣ Critical Notes
Ensure Docker container is running before connecting.
Use exact credentials above (gramorx / secret) and DB name (gramorx-db).
Some RLS policies and auth-related migrations fail locally without auth schema.
Migrations successfully applied:
Extensions: uuid-ossp, pgcrypto
Tables: feature_flags, api_audit, vocab_phase2_seed, onboarding_fields, etc.
✅ Next Steps Recommendation
Run a full migration audit on local DB.
Resolve missing auth schema and roles if needed for full RLS compliance.
Optional: automate container startup + DB creation + migrations with a script for developer convenience.

---
```
