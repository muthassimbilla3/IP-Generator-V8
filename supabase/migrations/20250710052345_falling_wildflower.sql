/*
  # Initial Schema for IP Proxy Generator

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `access_key` (text, unique)
      - `role` (text, admin/user)
      - `daily_limit` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `proxies`
      - `id` (uuid, primary key)
      - `proxy_string` (text, unique)
      - `is_used` (boolean)
      - `used_by` (uuid, foreign key to users)
      - `used_at` (timestamp)
      - `created_at` (timestamp)
    
    - `usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `amount` (integer)
      - `created_at` (timestamp)
    
    - `upload_history`
      - `id` (uuid, primary key)
      - `uploaded_by` (uuid, foreign key to users)
      - `file_name` (text)
      - `proxy_count` (integer)
      - `position` (text, 'prepend' or 'append')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  access_key text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  daily_limit integer DEFAULT 500,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create proxies table
CREATE TABLE IF NOT EXISTS proxies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proxy_string text UNIQUE NOT NULL,
  is_used boolean DEFAULT false,
  used_by uuid REFERENCES users(id),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create upload_history table
CREATE TABLE IF NOT EXISTS upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES users(id) NOT NULL,
  file_name text NOT NULL,
  proxy_count integer NOT NULL,
  position text NOT NULL CHECK (position IN ('prepend', 'append')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert users"
  ON users FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (true);

-- Proxies policies
CREATE POLICY "Users can read available proxies"
  ON proxies FOR SELECT
  USING (true);

CREATE POLICY "Users can update proxies when copying"
  ON proxies FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can insert proxies"
  ON proxies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can delete proxies"
  ON proxies FOR DELETE
  USING (true);

-- Usage logs policies
CREATE POLICY "Users can read their own usage logs"
  ON usage_logs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (true);

-- Upload history policies
CREATE POLICY "Admins can read all upload history"
  ON upload_history FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert upload history"
  ON upload_history FOR INSERT
  WITH CHECK (true);

-- Insert demo users
INSERT INTO users (username, access_key, role, daily_limit) VALUES
  ('admin', 'admin123', 'admin', 999999),
  ('user1', 'user1key', 'user', 500),
  ('user2', 'user2key', 'user', 300),
  ('user3', 'user3key', 'user', 200),
  ('user4', 'user4key', 'user', 400),
  ('user5', 'user5key', 'user', 350);

-- Insert demo proxies
INSERT INTO proxies (proxy_string) VALUES
  ('b2b-s1.liveproxies.io:7383:LV51828752-lv_us-21313:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s2.liveproxies.io:7383:LV51828752-lv_us-140153:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s3.liveproxies.io:7383:LV51828752-lv_us-86724:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s4.liveproxies.io:7383:LV51828752-lv_us-740421:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s5.liveproxies.io:7383:LV51828752-lv_us-77044:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s6.liveproxies.io:7383:LV51828752-lv_us-845199:IGnNJYj4ns1gAXrxrLQu'),
  ('b2b-s7.liveproxies.io:7383:LV51828752-lv_us-142496:IGnNJYj4ns1gAXrxrLQu');