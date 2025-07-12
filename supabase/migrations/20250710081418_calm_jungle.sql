/*
  # Fix User Creation Issue

  1. Changes
    - Update the role constraint to properly include manager role
    - Ensure all existing data is compatible with new role system
    - Add proper indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Ensure role validation works correctly
*/

-- First, remove the existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the updated constraint with all three roles
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user'));

-- Update any existing users that might have invalid roles (just in case)
UPDATE users SET role = 'user' WHERE role NOT IN ('admin', 'manager', 'user');

-- Ensure the manager user exists
INSERT INTO users (username, access_key, role, daily_limit, is_active) VALUES
  ('manager', 'manager123', 'manager', 999999, true)
ON CONFLICT (access_key) DO UPDATE SET
  role = EXCLUDED.role,
  daily_limit = EXCLUDED.daily_limit,
  is_active = EXCLUDED.is_active;

-- Add index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);