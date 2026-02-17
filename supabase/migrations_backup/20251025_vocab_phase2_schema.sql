-- Phase 2 schema updates for vocabulary SRS
alter table public.word_examples
  add column if not exists ielts_topic text;

create index if not exists word_examples_ielts_topic_idx
  on public.word_examples (ielts_topic);
