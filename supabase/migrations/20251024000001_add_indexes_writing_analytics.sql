create index if not exists writing_responses_user_created_idx on writing_responses (user_id, created_at desc);
create index if not exists writing_responses_attempt_idx on writing_responses (exam_attempt_id, task);
