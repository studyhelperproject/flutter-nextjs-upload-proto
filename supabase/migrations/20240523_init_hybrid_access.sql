-- Hybrid Access Control Migration
-- Created at: 2024-05-23

-- 1. Create function to check if request is from restricted origin (Next.js)
CREATE OR REPLACE FUNCTION public.is_restricted_origin()
RETURNS boolean AS $$
BEGIN
  -- Check if Origin header matches Next.js domain or localhost
  -- Replace 'https://your-nextjs-app.com' with your actual production domain
  RETURN (
    current_setting('request.headers', true)::json->>'origin' = 'https://your-nextjs-app.com'
    OR current_setting('request.headers', true)::json->>'origin' = 'http://localhost:3000'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. RLS Policies for user_profiles (Example Table)
-- Ensure RLS is enabled on the table
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy A: Allow SELECT only for non-restricted origins (e.g. Mobile App) or internal server processes
-- If is_restricted_origin() is true, this returning false blocks access.
CREATE POLICY "Allow select for mobile only"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  AND public.is_restricted_origin() = false 
);

-- Policy B: Allow UPDATE for all authenticated users (Self) regardless of origin
CREATE POLICY "Allow update for all apps"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Note: You might need to drop existing policies if they conflict.
-- DROP POLICY IF EXISTS "Allow select for mobile only" ON user_profiles;
-- DROP POLICY IF EXISTS "Allow update for all apps" ON user_profiles;
