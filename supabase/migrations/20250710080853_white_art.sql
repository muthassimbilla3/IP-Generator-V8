/*
  # ম্যানেজার রোল যোগ করা

  1. পরিবর্তন
    - users টেবিলে role চেক কনস্ট্রেইন্ট আপডেট করা হয়েছে 'manager' রোল যোগ করার জন্য
    - একটি ডেমো ম্যানেজার ইউজার যোগ করা হয়েছে

  2. নিরাপত্তা
    - বিদ্যমান RLS পলিসি অপরিবর্তিত থাকবে
*/

-- Update role constraint to include manager
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name LIKE '%role%'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  END IF;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user'));

-- Insert demo manager user
INSERT INTO users (username, access_key, role, daily_limit) VALUES
  ('manager', 'manager123', 'manager', 999999)
ON CONFLICT (access_key) DO NOTHING;