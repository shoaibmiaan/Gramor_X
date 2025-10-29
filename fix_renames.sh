cd /Users/solvioadvisors/Documents/Gramor_X/supabase/migrations/

# Remove placeholders if not already done
rm -f *_remote_placeholder.sql

# Clean renames (no comments in between; run as script or copy-paste carefully)
mv 20251024_create_api_audit_trail.sql 20251024000004_create_api_audit_trail.sql
mv 20251024_create_feature_flags.sql 20251024000005_create_feature_flags.sql
mv 20251025_add_onboarding_fields.sql 20251025000001_add_onboarding_fields.sql
mv 20251025_vocab_phase2_schema.sql 20251025000002_vocab_phase2_schema.sql
mv 20251026_create_experiments.sql 20251026000001_create_experiments.sql
mv 20251026_create_lifecycle_events.sql 20251026000002_create_lifecycle_events.sql
mv 20251026_create_orgs.sql 20251026000003_create_orgs.sql
mv 20251026_create_payment_intents.sql 20251026000004_create_payment_intents.sql
mv 20251026_create_referrals.sql 20251026000005_create_referrals.sql
mv 20251026_create_writing_topics.sql 20251026000006_create_writing_topics.sql
mv 20251026_vocab_phase2_seed.sql 20251026000007_vocab_phase2_seed.sql
mv 20251030_align_profiles_for_setup.sql 20251030000001_align_profiles_for_setup.sql
mv 20251030_daily_plan_reminder_logs.sql 20251030000002_daily_plan_reminder_logs.sql
mv 20260318_exam_event_payloads.sql 20260318000001_exam_event_payloads.sql
mv 20260318_mock_checkpoints.sql 20260318000002_mock_checkpoints.sql
mv 20260318_mock_reading_notes.sql 20260318000003_mock_reading_notes.sql

# Verify all renames (list files sorted)
ls -1 *.sql | sort

# Now repair the oldest conflicting version
supabase migration repair --status reverted 20250811

# Pull to sync
supabase db pull

# Push without --include-all to apply only new/pending
supabase db push

# List to confirm
supabase migration list

# Seed if needed
supabase db seed