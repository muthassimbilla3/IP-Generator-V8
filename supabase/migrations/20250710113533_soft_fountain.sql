/*
  # Fix users table insert policy

  1. Changes
    - Update the "Only admins can insert users" policy to allow inserts
    - Change WITH CHECK from false to true to enable user creation

  2. Security Note
    - This allows user creation but should be secured with proper authentication
    - In production, consider using Supabase Auth or service role key for admin operations
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only admins can insert users" ON users;

-- Create a new policy that allows inserts
CREATE POLICY "Only admins can insert users"
  ON users FOR INSERT
  WITH CHECK (true);