CREATE TABLE IF NOT EXISTS "user_system_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"system_key" varchar(30) NOT NULL,
	"access_level" varchar(20) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_role" varchar(30) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"primary_branch_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_branch_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"branch_role" varchar(30) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"branch_id" uuid,
	"device_id" varchar(128),
	"refresh_token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"last_seen_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_channel_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_type" varchar(20) NOT NULL,
	"external_user_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_system_entitlements" ADD CONSTRAINT "user_system_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_system_entitlements" ADD CONSTRAINT "user_system_entitlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_primary_branch_id_branches_id_fk" FOREIGN KEY ("primary_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_session_events" ADD CONSTRAINT "auth_session_events_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_session_events" ADD CONSTRAINT "auth_session_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_session_events" ADD CONSTRAINT "auth_session_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_channel_bindings" ADD CONSTRAINT "user_channel_bindings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_channel_bindings" ADD CONSTRAINT "user_channel_bindings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_system_entitlements_user_id_idx" ON "user_system_entitlements" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_system_entitlements_tenant_id_idx" ON "user_system_entitlements" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_system_entitlements_system_key_idx" ON "user_system_entitlements" USING btree ("system_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_tenant_memberships_user_id_idx" ON "user_tenant_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_tenant_memberships_tenant_id_idx" ON "user_tenant_memberships" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_tenant_memberships_status_idx" ON "user_tenant_memberships" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_branch_memberships_user_id_idx" ON "user_branch_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_branch_memberships_tenant_id_idx" ON "user_branch_memberships" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_branch_memberships_branch_id_idx" ON "user_branch_memberships" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_tenant_id_idx" ON "auth_sessions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_refresh_token_hash_idx" ON "auth_sessions" USING btree ("refresh_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_revoked_at_idx" ON "auth_sessions" USING btree ("revoked_at", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_session_events_session_id_idx" ON "auth_session_events" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_session_events_user_id_idx" ON "auth_session_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_session_events_event_type_idx" ON "auth_session_events" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_channel_bindings_user_id_idx" ON "user_channel_bindings" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_channel_bindings_tenant_id_idx" ON "user_channel_bindings" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_channel_bindings_channel_type_idx" ON "user_channel_bindings" USING btree ("channel_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_channel_bindings_external_user_id_idx" ON "user_channel_bindings" USING btree ("external_user_id");