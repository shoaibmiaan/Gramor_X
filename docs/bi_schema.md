# BI Export Schema

The nightly BI export reuses the same dataset as `/api/exports/analytics.parquet` and the
`tools/bi/supabase_to_s3.ts` uploader. Each row represents a consolidated IELTS writing
attempt enriched with the latest profile metadata.

| Column         | Type        | Description                                                                         |
| -------------- | ----------- | ----------------------------------------------------------------------------------- |
| `attempt_id`   | `string`    | Primary key from `exam_attempts.id`.                                                |
| `user_id`      | `string`    | Supabase auth user that completed the attempt.                                      |
| `org_ids`      | `string`    | Comma separated organization ids the user belongs to (empty for personal accounts). |
| `plan`         | `string`    | Normalised plan (`free`, `starter`, `booster`, `master`).                           |
| `submitted_at` | `timestamp` | When the attempt was submitted (falls back to `exam_attempts.updated_at`).          |
| `goal_band`    | `number`    | Optional goal band recorded on the attempt.                                         |
| `average_band` | `number`    | Average of available writing task bands rounded to 2 decimals.                      |
| `task1_band`   | `number`    | Band score for task 1 when available.                                               |
| `task2_band`   | `number`    | Band score for task 2 when available.                                               |

## Operational Notes

- CSV exports are limited to 10,000 rows to guarantee response times under 10 seconds.
- Parquet exports use the same filter set and schema, making the BI job idempotent when rerun.
- All exports record an `account_audit_log` entry with the format (`csv` or `parquet`), organization scope, and row count.
- Teachers must set an active organization before exporting to ensure RLS parity with the app UI.
- The BI uploader expects `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `BI_EXPORT_BUCKET` to be set. Use
  `BI_EXPORT_PREFIX` to change the S3 folder path.
