/*
  # Fix Foreign Key Constraints for User Deletion

  1. Changes
    - Drop and recreate foreign key constraints with CASCADE delete
    - This allows users to be deleted even if they have related records
    - Related records in usage_logs and upload_history will be automatically deleted

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity while allowing proper deletion
*/

-- Drop existing foreign key constraints
ALTER TABLE usage_logs DROP CONSTRAINT IF EXISTS usage_logs_user_id_fkey;
ALTER TABLE upload_history DROP CONSTRAINT IF EXISTS upload_history_uploaded_by_fkey;
ALTER TABLE proxies DROP CONSTRAINT IF EXISTS proxies_used_by_fkey;

-- Recreate foreign key constraints with CASCADE delete
ALTER TABLE usage_logs 
ADD CONSTRAINT usage_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE upload_history 
ADD CONSTRAINT upload_history_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE proxies 
ADD CONSTRAINT proxies_used_by_fkey 
FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL;