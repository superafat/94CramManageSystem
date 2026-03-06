ALTER TABLE IF EXISTS "teachers" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);
--> statement-breakpoint
ALTER TABLE IF EXISTS "manage_teachers" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);