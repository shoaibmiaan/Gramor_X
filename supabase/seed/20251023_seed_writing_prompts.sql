-- 20251023_seed_writing_prompts.sql
-- Seed a minimal IELTS Writing prompt library for Task 1 and Task 2 flows.

insert into public.writing_prompts (slug, title, prompt_text, task_type, module, difficulty, source, tags, estimated_minutes, word_target)
values
  (
    'academic-task1-line-graphs-internet-access',
    'Internet access line graph',
    'The chart below shows the percentage of households in different income groups with access to the internet between 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'task1',
    'academic',
    'medium',
    'ielts.org',
    array['technology','line graph'],
    20,
    150
  ),
  (
    'academic-task2-education-rewards',
    'School rewards debate',
    'Some people think that schools should reward students who show the best academic results, while others believe that it is more important to reward students who show improvements. Discuss both views and give your own opinion.',
    'task2',
    'academic',
    'medium',
    'ielts.org',
    array['education','opinion'],
    40,
    250
  )
on conflict (slug) do update set
  title = excluded.title,
  prompt_text = excluded.prompt_text,
  task_type = excluded.task_type,
  module = excluded.module,
  difficulty = excluded.difficulty,
  source = excluded.source,
  tags = excluded.tags,
  estimated_minutes = excluded.estimated_minutes,
  word_target = excluded.word_target;
