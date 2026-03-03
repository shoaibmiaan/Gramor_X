# Phase 4 RLS Audit & Policy Matrix

## Sensitive table classification

| Table | Sensitive | RLS enabled in Phase 4 migration | User-own policies | Teacher access | Admin override |
|---|---|---:|---:|---:|---:|
| `profiles` | Yes | Yes | Yes (`id = auth.uid()`) | No | Yes (`is_admin()`) |
| `subscriptions` | Yes | Yes | Yes (`user_id = auth.uid()`) | No | Yes (`is_admin()`) |
| `usage_tracking` | Yes | Yes | Yes (`user_id = auth.uid()`) | No | Yes (`is_admin()`) |
| `mock_test_results` | Yes | Yes | Yes (`user_id = auth.uid()`) | Yes (`is_teacher_of(user_id)`) | Yes (`is_admin()`) |
| `writing_responses` | Yes | Yes | Yes (`user_id = auth.uid()`) | Yes (`is_teacher_of(user_id)`) | Yes (`is_admin()`) |
| `speaking_attempts` | Yes | Yes | Yes (`user_id = auth.uid()`) | Yes (`is_teacher_of(user_id)`) | Yes (`is_admin()`) |
| `account_audit_log` | Yes | Yes | Yes (`user_id = auth.uid()`) | No | Yes (`is_admin()`) |

## Role helper functions introduced

- `public.is_admin()`
  - Checks JWT role claims first.
  - Falls back to `profiles.role`.

- `public.is_teacher_of(student_id uuid)`
  - Returns `true` if caller is admin.
  - Otherwise checks the teacher/student relation through `class_members -> classes -> coaches`.

## Manual validation matrix (recommended)

1. **Student user**
   - Can read/insert/update own rows.
   - Cannot read or mutate another student's rows.

2. **Teacher user**
   - Can read own rows.
   - Can read rows of taught students on `mock_test_results`, `writing_responses`, `speaking_attempts`.
   - Cannot update/delete student rows unless explicitly granted elsewhere.

3. **Admin user**
   - Can read all sensitive rows via `is_admin()` policies.

4. **Anonymous/unauthenticated**
   - Cannot read or write sensitive rows.
