-- V4: System Redesign — Better than Google Sheets
-- teachers, classrooms, time_slots, lessons, invoices, leads, payroll

-- ===== Teachers =====
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone VARCHAR(20),
  school TEXT,
  department TEXT,
  specialty VARCHAR(10) DEFAULT 'both', -- arts|science|both
  id_number_hash TEXT,          -- bcrypt hash
  id_number_last4 VARCHAR(4),   -- display only
  birthday DATE,
  is_local BOOLEAN DEFAULT false,
  available_slots JSONB DEFAULT '{}',
  dispatch_branches UUID[] DEFAULT '{}',
  hourly_rates JSONB DEFAULT '{"tutoring":250,"private":350,"assistant":88}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON teachers(tenant_id);

-- ===== Classrooms =====
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(20) NOT NULL,
  capacity INT DEFAULT 1,
  equipment JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_classrooms_branch ON classrooms(branch_id);

-- ===== Time Slots (scheduling core) =====
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  student_id UUID REFERENCES students(id),
  teacher_id UUID REFERENCES teachers(id),
  classroom_id UUID REFERENCES classrooms(id),
  enrollment_id UUID REFERENCES enrollments(id),
  subject VARCHAR(30) NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_min INT,
  recurrence VARCHAR(20) DEFAULT 'weekly',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeslots_tenant ON time_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timeslots_student ON time_slots(student_id);
CREATE INDEX IF NOT EXISTS idx_timeslots_teacher ON time_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timeslots_day ON time_slots(day_of_week, start_time);

-- Conflict prevention: no double-booking
CREATE UNIQUE INDEX IF NOT EXISTS uq_timeslot_student
  ON time_slots(tenant_id, student_id, day_of_week, start_time, effective_from)
  WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS uq_timeslot_teacher
  ON time_slots(tenant_id, teacher_id, day_of_week, start_time, effective_from)
  WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS uq_timeslot_classroom
  ON time_slots(tenant_id, classroom_id, day_of_week, start_time, effective_from)
  WHERE status = 'active' AND classroom_id IS NOT NULL;

-- ===== Lessons (replaces daily sheets) =====
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  time_slot_id UUID REFERENCES time_slots(id),
  student_id UUID REFERENCES students(id) NOT NULL,
  teacher_id UUID REFERENCES teachers(id),
  date DATE NOT NULL,
  subject VARCHAR(30),
  attendance VARCHAR(10) DEFAULT 'present',
  video_chapter TEXT,
  knowledge_points TEXT,
  video_duration_min INT,
  test_assigned TEXT,
  homework TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lessons_student ON lessons(student_id, date);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant ON lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);

-- ===== Invoices (auto billing) =====
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id),
  branch_id UUID REFERENCES branches(id),
  period VARCHAR(7) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INT NOT NULL DEFAULT 0,
  discount INT DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending|sent|paid|overdue
  paid_at TIMESTAMP,
  payment_method VARCHAR(20),
  payment_ref VARCHAR(50),
  due_date DATE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ===== Leads (enrollment funnel) =====
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  inquiry_date DATE DEFAULT CURRENT_DATE,
  source VARCHAR(30), -- dm|facebook|phone|referral|walk_in
  parent_name TEXT,
  parent_phone VARCHAR(20),
  student_name TEXT,
  school TEXT,
  grade VARCHAR(10),
  interested_subjects TEXT[],
  preferred_contact_time TEXT,
  follow_up_notes TEXT,
  status VARCHAR(20) DEFAULT 'inquiry', -- inquiry|scheduled|trial|enrolled|declined|lost
  assigned_to UUID REFERENCES users(id),
  next_follow_up DATE,
  trial_date TIMESTAMP,
  converted_student_id UUID REFERENCES students(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow ON leads(next_follow_up);

-- ===== Payroll Records =====
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  teacher_id UUID REFERENCES teachers(id),
  period VARCHAR(7) NOT NULL,
  tutoring_sessions INT DEFAULT 0,
  private_sessions INT DEFAULT 0,
  assistant_sessions INT DEFAULT 0,
  tutoring_amount INT DEFAULT 0,
  private_amount INT DEFAULT 0,
  assistant_amount INT DEFAULT 0,
  bonus INT DEFAULT 0,
  deduction INT DEFAULT 0,
  total_amount INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- draft|confirmed|paid
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON payroll_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(period);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_records(tenant_id);

-- ===== Expand students table =====
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone_alt VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS platform_accounts JSONB DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ===== Expand enrollments table =====
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS unit_price INT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS sessions_per_week INT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS textbook_fee INT DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS platform_fee INT DEFAULT 0;
