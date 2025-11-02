-- 20260402000001_seed_writing_prompts_100.sql
-- Seed 100 writing prompts into public.writing_prompts
-- Idempotent: uses ON CONFLICT (slug) DO NOTHING
-- IMPORTANT: this assumes public.writing_task_type enum contains 'task1' and 'task2'.
-- If your enum uses different names, replace 'task1'/'task2' in the CASE below.

BEGIN;

-- Ensure pgcrypto available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH seeds AS (
  SELECT
    i,
    -- topic (varied set cycled through)
    (CASE ((i - 1) % 25 + 1)
      WHEN 1 THEN 'The impact of social media on interpersonal communication'
      WHEN 2 THEN 'Climate change and responsibility of developed countries'
      WHEN 3 THEN 'Benefits and drawbacks of remote work'
      WHEN 4 THEN 'The role of public transport in modern cities'
      WHEN 5 THEN 'Should governments subsidize renewable energy?'
      WHEN 6 THEN 'The importance of mental health education in schools'
      WHEN 7 THEN 'Effects of globalization on local culture'
      WHEN 8 THEN 'Advantages of multilingual education'
      WHEN 9 THEN 'How technology is reshaping healthcare'
      WHEN 10 THEN 'Is space exploration still worth the investment?'
      WHEN 11 THEN 'The ethics of artificial intelligence in daily life'
      WHEN 12 THEN 'Urban green spaces and citizens wellbeing'
      WHEN 13 THEN 'Food waste: causes and possible solutions'
      WHEN 14 THEN 'The influence of advertising on consumer choices'
      WHEN 15 THEN 'Are electric cars the solution to urban pollution?'
      WHEN 16 THEN 'Youth unemployment: causes and policy responses'
      WHEN 17 THEN 'Fast fashion and its environmental impact'
      WHEN 18 THEN 'Balancing economic growth and environmental protection'
      WHEN 19 THEN 'The role of sports in promoting social cohesion'
      WHEN 20 THEN 'Privacy vs security: striking the right balance'
      WHEN 21 THEN 'Digital education: benefits and barriers'
      WHEN 22 THEN 'Should single-use plastics be banned?'
      WHEN 23 THEN 'The future of work: automation and humans'
      WHEN 24 THEN 'Civic engagement: how to increase voter turnout'
      ELSE 'Sustainable tourism: preserving culture and nature'
    END) AS topic,
    -- create a kebab-case base for slug and append index to ensure uniqueness
    lower(regexp_replace(
      (CASE ((i - 1) % 25 + 1)
        WHEN 1 THEN 'The impact of social media on interpersonal communication'
        WHEN 2 THEN 'Climate change and responsibility of developed countries'
        WHEN 3 THEN 'Benefits and drawbacks of remote work'
        WHEN 4 THEN 'The role of public transport in modern cities'
        WHEN 5 THEN 'Should governments subsidize renewable energy?'
        WHEN 6 THEN 'The importance of mental health education in schools'
        WHEN 7 THEN 'Effects of globalization on local culture'
        WHEN 8 THEN 'Advantages of multilingual education'
        WHEN 9 THEN 'How technology is reshaping healthcare'
        WHEN 10 THEN 'Is space exploration still worth the investment?'
        WHEN 11 THEN 'The ethics of artificial intelligence in daily life'
        WHEN 12 THEN 'Urban green spaces and citizens wellbeing'
        WHEN 13 THEN 'Food waste: causes and possible solutions'
        WHEN 14 THEN 'The influence of advertising on consumer choices'
        WHEN 15 THEN 'Are electric cars the solution to urban pollution?'
        WHEN 16 THEN 'Youth unemployment: causes and policy responses'
        WHEN 17 THEN 'Fast fashion and its environmental impact'
        WHEN 18 THEN 'Balancing economic growth and environmental protection'
        WHEN 19 THEN 'The role of sports in promoting social cohesion'
        WHEN 20 THEN 'Privacy vs security: striking the right balance'
        WHEN 21 THEN 'Digital education: benefits and barriers'
        WHEN 22 THEN 'Should single-use plastics be banned?'
        WHEN 23 THEN 'The future of work: automation and humans'
        WHEN 24 THEN 'Civic engagement: how to increase voter turnout'
        ELSE 'Sustainable tourism: preserving culture and nature'
      END),
      '[^a-z0-9]+', '-', 'g'
    )) || '-' || i::text AS slug,
    -- task_type alternates for variety
    (CASE WHEN i % 2 = 0 THEN 'task1' ELSE 'task2' END) AS task_type,
    -- difficulty cycles 1..5
    (((i - 1) % 5) + 1)::int AS difficulty,
    jsonb_build_object(
      'outline_summary',
        'Write a clear, structured response covering causes, consequences, and a balanced conclusion with concrete examples.',
      'outline_items',
        jsonb_build_array(
          ('Introduction: state the issue and your position (prompt ' || i::text || ')'),
          ('Body 1: main point with evidence or example'),
          ('Body 2: counterpoint or alternative view, then rebuttal, conclusion with recommendation')
        )
    ) AS outline_json,
    now() - ((100 - i) || ' days')::interval AS created_at
  FROM generate_series(1,100) AS s(i)
)

INSERT INTO public.writing_prompts (id, slug, topic, task_type, difficulty, outline_json, created_at)
SELECT
  gen_random_uuid(),
  slug,
  topic,
  task_type::public.writing_task_type,
  difficulty,
  outline_json,
  created_at
FROM seeds
ON CONFLICT (slug) DO NOTHING;

COMMIT;
