-- W8 Schema Migration: 講師排課 + 薪資系統
-- 執行於: hivemind_db (Cloud SQL)
-- 日期: 2026-02-14

-- 1. 講師表 (與 users 關聯)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(20) DEFAULT '教師',
  phone VARCHAR(20),
  rate_per_class DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 課程表
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(50),
  duration_minutes INT DEFAULT 60,
  max_students INT DEFAULT 10,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 排課表
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 課程學生關聯
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  UNIQUE(course_id, student_id)
);

-- 5. 調課紀錄
CREATE TABLE IF NOT EXISTS schedule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL,
  original_date DATE,
  original_time TIME,
  new_date DATE,
  new_time TIME,
  reason TEXT,
  changed_by UUID REFERENCES users(id),
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 家長-學生關聯
CREATE TABLE IF NOT EXISTS parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(20) DEFAULT '家長',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- 7. 薪資結算表
CREATE TABLE IF NOT EXISTS salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_classes INT NOT NULL,
  rate_per_class DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON teachers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teachers_branch ON teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_courses_tenant ON courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_course ON schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_salary_teacher ON salary_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_salary_period ON salary_records(period_start, period_end);
