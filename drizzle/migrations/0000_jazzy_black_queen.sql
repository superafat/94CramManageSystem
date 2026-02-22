CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tenant_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(50),
	"resource_id" uuid,
	"detail" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"status" varchar(20) NOT NULL,
	"check_in_time" timestamp,
	"check_in_method" varchar(20),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_exam_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"exam_date" timestamp NOT NULL,
	"total_score" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_nfc_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"card_uid" varchar(100) NOT NULL,
	"student_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "inclass_nfc_cards_card_uid_unique" UNIQUE("card_uid")
);
--> statement-breakpoint
CREATE TABLE "manage_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(100),
	"grade" varchar(20),
	"price" numeric(10, 2),
	"hours" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manage_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manage_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(20),
	"paid_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manage_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"grade" varchar(20),
	"school" varchar(255),
	"guardian_name" varchar(100),
	"guardian_phone" varchar(20),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "manage_teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"expertise" text,
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"sku" varchar(50),
	"unit" varchar(20) DEFAULT '個',
	"min_stock" integer DEFAULT 10,
	"price" numeric(10, 2),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stock_items_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "stock_purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2),
	"received_quantity" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "stock_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_id" uuid,
	"order_number" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"total_amount" numeric(12, 2),
	"order_date" timestamp,
	"expected_delivery_date" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stock_purchase_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "stock_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact" varchar(100),
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"reference_id" uuid,
	"note" text,
	"operator_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"branch_id" uuid,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'staff' NOT NULL,
	"permissions" text[],
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclass_exam_scores" ADD CONSTRAINT "inclass_exam_scores_exam_id_inclass_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."inclass_exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manage_enrollments" ADD CONSTRAINT "manage_enrollments_student_id_manage_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."manage_students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manage_enrollments" ADD CONSTRAINT "manage_enrollments_course_id_manage_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."manage_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manage_payments" ADD CONSTRAINT "manage_payments_enrollment_id_manage_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."manage_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_inventory" ADD CONSTRAINT "stock_inventory_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_inventory" ADD CONSTRAINT "stock_inventory_warehouse_id_stock_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."stock_warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_category_id_stock_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."stock_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_purchase_items" ADD CONSTRAINT "stock_purchase_items_order_id_stock_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."stock_purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_purchase_items" ADD CONSTRAINT "stock_purchase_items_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_purchase_orders" ADD CONSTRAINT "stock_purchase_orders_supplier_id_stock_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."stock_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_item_id_stock_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_warehouse_id_stock_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."stock_warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;