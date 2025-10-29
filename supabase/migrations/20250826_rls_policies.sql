-- Role-based RLS policies for profiles, subscriptions, and attempt tables

-- Profiles
alter table if exists public.profiles enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Students manage own profile" ON public.profiles; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Admins can manage profiles"
    ON public.profiles
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

  CREATE POLICY "Students manage own profile"
    ON public.profiles
    FOR ALL
    USING (auth.uid() = id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = id AND auth.jwt()->>'role' = 'student');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Subscriptions
alter table if exists public.subscriptions enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Students manage own subscriptions" ON public.subscriptions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Students manage own subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (auth.uid() = user_id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' = 'student');

  CREATE POLICY "Admins manage subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Reading attempts
alter table if exists public.reading_attempts enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Students manage own reading_attempts" ON public.reading_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Admins manage reading_attempts" ON public.reading_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Students manage own reading_attempts"
    ON public.reading_attempts
    FOR ALL
    USING (auth.uid() = user_id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' = 'student');

  CREATE POLICY "Admins manage reading_attempts"
    ON public.reading_attempts
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Listening attempts
alter table if exists public.listening_attempts enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Students manage own listening_attempts" ON public.listening_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Admins manage listening_attempts" ON public.listening_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Students manage own listening_attempts"
    ON public.listening_attempts
    FOR ALL
    USING (auth.uid() = user_id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' = 'student');

  CREATE POLICY "Admins manage listening_attempts"
    ON public.listening_attempts
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Writing attempts
alter table if exists public.writing_attempts enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Students manage own writing_attempts" ON public.writing_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Admins manage writing_attempts" ON public.writing_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Students manage own writing_attempts"
    ON public.writing_attempts
    FOR ALL
    USING (auth.uid() = user_id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' = 'student');

  CREATE POLICY "Admins manage writing_attempts"
    ON public.writing_attempts
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- Speaking attempts
alter table if exists public.speaking_attempts enable row level security;

DO $$ BEGIN
  BEGIN DROP POLICY IF EXISTS "Students manage own speaking_attempts" ON public.speaking_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Admins manage speaking_attempts" ON public.speaking_attempts; EXCEPTION WHEN undefined_table THEN NULL; END;

  CREATE POLICY "Students manage own speaking_attempts"
    ON public.speaking_attempts
    FOR ALL
    USING (auth.uid() = user_id AND auth.jwt()->>'role' = 'student')
    WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' = 'student');

  CREATE POLICY "Admins manage speaking_attempts"
    ON public.speaking_attempts
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
