-- RLS-like policies for Storage
-- Allow authenticated users to manage only their folder

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars read public'
  ) THEN
    CREATE POLICY "avatars read public"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow authenticated users to upload to their own folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars upload own'
  ) THEN
    CREATE POLICY "avatars upload own"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow authenticated users to update their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars update own'
  ) THEN
    CREATE POLICY "avatars update own"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
  END IF;
END $$;

-- Allow authenticated users to delete their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'avatars delete own'
  ) THEN
    CREATE POLICY "avatars delete own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');
  END IF;
END $$;