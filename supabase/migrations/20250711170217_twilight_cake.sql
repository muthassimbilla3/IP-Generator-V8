/*
  # Fix Function Search Path Warning

  1. Changes
    - Add proper search_path to reset_daily_usage function
    - This resolves the Supabase Security Advisor warning

  2. Security
    - Setting search_path prevents potential security issues
    - Ensures function uses correct schema references
*/

-- Create or replace the reset_daily_usage function with proper search_path
CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset daily usage for all users
  -- This function can be called by a cron job or manually
  -- to reset usage counters at the start of each day
  
  -- For now, this is just a placeholder function
  -- You can add logic here to reset daily usage if needed
  RAISE NOTICE 'Daily usage reset function called';
END;
$$;