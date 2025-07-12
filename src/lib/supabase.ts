import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  username: string;
  access_key: string;
  role: 'admin' | 'manager' | 'user';
  daily_limit: number;
  is_active: boolean;
  created_at: string;
  cooldown_minutes: number; // Actually stores hours now
  last_generation_at?: string;
  next_generation_at?: string;
};

export type Proxy = {
  id: string;
  proxy_string: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_at: string;
};

export type UsageLog = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
};

export type UploadHistory = {
  id: string;
  uploaded_by: string;
  file_name: string;
  proxy_count: number;
  position: 'prepend' | 'append';
  created_at: string;
};