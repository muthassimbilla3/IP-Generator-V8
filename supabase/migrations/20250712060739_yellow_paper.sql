/*
  # Unlimited System Migration

  1. Changes
    - Remove daily limit restrictions by setting all users to unlimited (999999999)
    - Remove cooldown system by setting all cooldown fields to 0/null
    - Update existing users to have unlimited access

  2. Security
    - Maintain existing RLS policies
    - Keep user management functionality intact
*/

-- Update all existing users to have unlimited access
UPDATE users SET 
  daily_limit = 999999999,
  cooldown_minutes = 0,
  last_generation_at = NULL,
  next_generation_at = NULL
WHERE daily_limit < 999999999 OR cooldown_minutes > 0 OR last_generation_at IS NOT NULL OR next_generation_at IS NOT NULL;

-- Set default daily limit to unlimited for new users
ALTER TABLE users ALTER COLUMN daily_limit SET DEFAULT 999999999;
ALTER TABLE users ALTER COLUMN cooldown_minutes SET DEFAULT 0;

-- Update demo users to ensure they have unlimited access
UPDATE users SET 
  daily_limit = 999999999,
  cooldown_minutes = 0,
  last_generation_at = NULL,
  next_generation_at = NULL
WHERE username IN ('admin', 'manager', 'user1', 'user2', 'user3', 'user4', 'user5');