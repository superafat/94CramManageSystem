CREATE TABLE "inclass_parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"line_user_id" varchar(255),
	"relation" varchar(50),
	"notify_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"payment_type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"period_month" varchar(7),
	"payment_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inclass_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"teacher_id" uuid,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"room" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "manage_courses" ADD COLUMN "fee_monthly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "manage_courses" ADD COLUMN "fee_quarterly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "manage_courses" ADD COLUMN "fee_semester" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "manage_courses" ADD COLUMN "fee_yearly" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inclass_parents" ADD CONSTRAINT "inclass_parents_student_id_manage_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."manage_students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclass_payment_records" ADD CONSTRAINT "inclass_payment_records_student_id_manage_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."manage_students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclass_payment_records" ADD CONSTRAINT "inclass_payment_records_course_id_manage_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."manage_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclass_schedules" ADD CONSTRAINT "inclass_schedules_course_id_manage_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."manage_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclass_schedules" ADD CONSTRAINT "inclass_schedules_teacher_id_manage_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."manage_teachers"("id") ON DELETE no action ON UPDATE no action;