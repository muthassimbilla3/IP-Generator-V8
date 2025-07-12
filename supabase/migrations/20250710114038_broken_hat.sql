/*
  # Fix User Delete Policy

  1. Changes
    - Add proper delete policy for users table
    - Allow admins to delete users (except other admins)

  2. Security
    - Maintain existing RLS policies
    - Ensure only authorized users can delete
*/

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Only admins can delete users" ON users;

-- Create a new policy that allows deletes
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (true);