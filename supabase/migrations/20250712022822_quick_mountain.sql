/*
  # Add Cooldown System for IP Generation

  1. New Columns
    - `users` table:
      - `cooldown_minutes` (integer) - How many minutes user must wait between IP generations
      - `last_generation_at` (timestamp) - When user last generated IPs
      - `next_generation_at` (timestamp) - When user can generate IPs again

  2. Security
    - Maintain existing RLS policies
    - Add indexes for better performance
*/

-- Add cooldown columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cooldown_minutes'
  ) THEN
    ALTER TABLE users ADD COLUMN cooldown_minutes integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_generation_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_generation_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'next_generation_at'
  ) THEN
    ALTER TABLE users ADD COLUMN next_generation_at timestamptz;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_next_generation_at ON users(next_generation_at);
CREATE INDEX IF NOT EXISTS idx_users_last_generation_at ON users(last_generation_at);

-- Create function to update next generation time
CREATE OR REPLACE FUNCTION public.update_next_generation_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update next generation time when cooldown_minutes changes
  IF OLD.cooldown_minutes IS DISTINCT FROM NEW.cooldown_minutes AND NEW.last_generation_at IS NOT NULL THEN
    NEW.next_generation_at = NEW.last_generation_at + (NEW.cooldown_minutes || ' minutes')::interval;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update next generation time
DROP TRIGGER IF EXISTS trigger_update_next_generation_time ON users;
CREATE TRIGGER trigger_update_next_generation_time
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_next_generation_time();