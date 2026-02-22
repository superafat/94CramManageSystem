-- Migration v8: Add LINE support
-- Add line_user_id to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_line ON users(line_user_id);

-- 說明：
-- 此欄位用於儲存 LINE Bot 的 user ID
-- 當用戶透過 LINE Bot follow 事件時，會儲存此 ID
-- 用於發送 LINE Push Message
