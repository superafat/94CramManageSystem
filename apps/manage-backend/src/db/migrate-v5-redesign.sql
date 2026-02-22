-- ================================================================
-- 愛學館補習班管理系統 v5 Schema Redesign
-- ================================================================
-- Author: 妲己 (Backend Architect)
-- Date: 2026-02-13
-- Database: PostgreSQL 14+
-- ORM: Drizzle ORM + TypeScript
-- ================================================================

-- ================================================================
-- 1. COURSE MANAGEMENT (課程管理體系)
-- ================================================================

-- 1.1 課程目錄 (Course Catalog)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    
    -- 課程基本資訊
    code VARCHAR(50) NOT NULL,           -- 課程代碼 (e.g., "MATH-G7", "ENG-G9")
    name VARCHAR(255) NOT NULL,          -- 課程名稱 (e.g., "國一數學", "高中英文")
    subject VARCHAR(100) NOT NULL,       -- 科目 (數學/英文/理化/社會/安親/作文/美術)
    grade_level VARCHAR(50),             -- 年級 (國一/國二/國三/高一/高二/高三/國小)
    
    -- 課程內容
    description TEXT,                    -- 課程說明
    syllabus TEXT,                       -- 課程大綱
    learning_objectives TEXT[],          -- 學習目標
    
    -- 課程設定
    duration_minutes INTEGER NOT NULL DEFAULT 120,  -- 單次課程時長（分鐘）
    max_students INTEGER DEFAULT 24,     -- 最大學生數
    min_students INTEGER DEFAULT 1,      -- 最小開班人數
    
    -- 狀態管理
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, inactive, archived
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 約束條件
    UNIQUE(tenant_id, code),
    CHECK (max_students >= min_students),
    CHECK (duration_minutes > 0)
);

CREATE INDEX idx_courses_tenant_branch ON courses(tenant_id, branch_id);
CREATE INDEX idx_courses_subject ON courses(subject);
CREATE INDEX idx_courses_grade_level ON courses(grade_level);
CREATE INDEX idx_courses_status ON courses(status);

-- 1.2 課程定價 (Course Pricing)
CREATE TABLE IF NOT EXISTS course_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- 定價策略
    pricing_type VARCHAR(50) NOT NULL DEFAULT 'per_session',  -- per_session, monthly, term, hourly
    base_price DECIMAL(10, 2) NOT NULL,      -- 基礎價格
    currency VARCHAR(3) NOT NULL DEFAULT 'TWD',
    
    -- 計費單位
    billing_unit VARCHAR(50),            -- session（堂）, month（月）, term（學期）, hour（小時）
    sessions_included INTEGER,           -- 包含堂數（月繳/學期制）
    
    -- 價格範圍（多級定價）
    min_sessions INTEGER,                -- 最小堂數（例如：買10堂以上才適用）
    max_sessions INTEGER,                -- 最大堂數
    
    -- 折扣設定
    early_bird_discount DECIMAL(5, 2),   -- 早鳥折扣（%）
    sibling_discount DECIMAL(5, 2),      -- 手足折扣（%）
    loyalty_discount DECIMAL(5, 2),      -- 續班折扣（%）
    
    -- 生效期間
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- 狀態
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 約束條件
    CHECK (base_price >= 0),
    CHECK (early_bird_discount >= 0 AND early_bird_discount <= 100),
    CHECK (sibling_discount >= 0 AND sibling_discount <= 100),
    CHECK (loyalty_discount >= 0 AND loyalty_discount <= 100),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_course_pricing_course ON course_pricing(course_id);
CREATE INDEX idx_course_pricing_effective ON course_pricing(effective_from, effective_to);

-- 1.3 固定課表 (Course Schedules - 週期性排課)
CREATE TABLE IF NOT EXISTS course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    
    -- 週期設定
    day_of_week INTEGER NOT NULL,       -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,            -- 開始時間 (e.g., 18:00)
    end_time TIME NOT NULL,              -- 結束時間 (e.g., 20:00)
    
    -- 生效期間
    effective_from DATE NOT NULL,        -- 此排課開始日期
    effective_to DATE,                   -- 此排課結束日期（NULL = 無限期）
    
    -- 例外日期（停課）
    excluded_dates DATE[],               -- 例外停課日（國定假日、寒暑假）
    
    -- 狀態
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- 備註
    notes TEXT,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 約束條件
    CHECK (day_of_week BETWEEN 0 AND 6),
    CHECK (end_time > start_time)
);

CREATE INDEX idx_course_schedules_course ON course_schedules(course_id);
CREATE INDEX idx_course_schedules_teacher ON course_schedules(teacher_id);
CREATE INDEX idx_course_schedules_day ON course_schedules(day_of_week);
CREATE INDEX idx_course_schedules_effective ON course_schedules(effective_from, effective_to);

-- ================================================================
-- 2. PARENT MANAGEMENT (家長管理)
-- ================================================================

-- 2.1 家長資料表
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 基本資料
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50),            -- 父、母、祖父母、監護人
    
    -- 聯絡資訊
    phone VARCHAR(20),
    mobile VARCHAR(20),
    email VARCHAR(255),
    line_id VARCHAR(100),
    
    -- 通訊地址
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- 緊急聯絡人
    is_emergency_contact BOOLEAN DEFAULT false,
    emergency_priority INTEGER,          -- 緊急聯絡優先順序（1=第一順位）
    
    -- 溝通偏好
    preferred_contact_method VARCHAR(50),  -- phone, email, line, sms
    preferred_contact_time VARCHAR(100),   -- 偏好聯絡時段
    
    -- 備註
    notes TEXT,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parents_tenant ON parents(tenant_id);
CREATE INDEX idx_parents_phone ON parents(phone);
CREATE INDEX idx_parents_email ON parents(email);

-- 2.2 學生-家長關係表（多對多）
CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    
    -- 關係說明
    relationship VARCHAR(50) NOT NULL,   -- father, mother, grandfather, grandmother, guardian
    is_primary BOOLEAN DEFAULT false,    -- 主要聯絡家長
    
    -- 權限設定
    can_pickup BOOLEAN DEFAULT true,     -- 可接送
    can_authorize BOOLEAN DEFAULT true,  -- 可代為簽署文件
    receive_reports BOOLEAN DEFAULT true, -- 接收成績報告
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 約束條件
    UNIQUE(student_id, parent_id)
);

CREATE INDEX idx_student_parents_student ON student_parents(student_id);
CREATE INDEX idx_student_parents_parent ON student_parents(parent_id);

-- ================================================================
-- 3. ENROLLMENT ENHANCEMENT (報名強化)
-- ================================================================

-- 重新設計 enrollments（假設原本已存在，這裡是 ALTER 版本）
-- 如果需要完全重建，請先 DROP TABLE enrollments CASCADE;

-- 新增欄位到 enrollments
ALTER TABLE enrollments 
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS course_schedule_id UUID REFERENCES course_schedules(id) ON DELETE SET NULL,
    
    -- 學費資訊
    ADD COLUMN IF NOT EXISTS tuition_amount DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(50) DEFAULT 'monthly',  -- monthly, term, per_session
    
    -- 報名資訊
    ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS enrollment_status VARCHAR(50) DEFAULT 'active',  -- active, paused, completed, withdrawn
    
    -- 備註
    ADD COLUMN IF NOT EXISTS enrollment_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_schedule ON enrollments(course_schedule_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(enrollment_status);

-- ================================================================
-- 4. ATTENDANCE ENHANCEMENT (出席追蹤強化)
-- ================================================================

-- 4.1 擴充 attendance 狀態
ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'present',
    -- present（出席）, absent（缺席）, late（遲到）, 
    -- leave（請假）, excused（公假）, makeup（補課）
    
    ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS minutes_late INTEGER DEFAULT 0,
    
    -- 請假/補課關聯
    ADD COLUMN IF NOT EXISTS leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS makeup_session_id UUID REFERENCES makeup_sessions(id) ON DELETE SET NULL,
    
    -- 備註
    ADD COLUMN IF NOT EXISTS attendance_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_leave_request ON attendance(leave_request_id);

-- 4.2 請假申請表
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- 請假資訊
    leave_date DATE NOT NULL,
    leave_type VARCHAR(50) NOT NULL,     -- sick（病假）, personal（事假）, family（家庭因素）
    reason TEXT,
    
    -- 申請與審核
    requested_by UUID REFERENCES parents(id) ON DELETE SET NULL,  -- 誰申請的（家長）
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,     -- 誰批准的（管理員）
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',       -- pending, approved, rejected
    
    -- 補課需求
    requires_makeup BOOLEAN DEFAULT true,
    makeup_arranged BOOLEAN DEFAULT false,
    
    -- 備註
    notes TEXT,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_lesson ON leave_requests(lesson_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(approval_status);
CREATE INDEX idx_leave_requests_date ON leave_requests(leave_date);

-- 4.3 補課記錄表
CREATE TABLE IF NOT EXISTS makeup_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    original_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    makeup_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
    
    -- 補課資訊
    scheduled_date DATE,
    scheduled_time TIME,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    
    -- 狀態追蹤
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',  -- scheduled, completed, cancelled, no_show
    attended BOOLEAN,
    
    -- 備註
    notes TEXT,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_makeup_sessions_student ON makeup_sessions(student_id);
CREATE INDEX idx_makeup_sessions_original ON makeup_sessions(original_lesson_id);
CREATE INDEX idx_makeup_sessions_status ON makeup_sessions(status);

-- ================================================================
-- 5. GRADING ENHANCEMENT (成績追蹤強化)
-- ================================================================

-- 5.1 評量類型定義
CREATE TABLE IF NOT EXISTS assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 評量類型
    code VARCHAR(50) NOT NULL,           -- MIDTERM, FINAL, QUIZ, HOMEWORK, CLASSWORK, PROJECT
    name VARCHAR(255) NOT NULL,          -- 段考、期末考、小考、作業、課堂表現、專題
    category VARCHAR(50) NOT NULL,       -- exam（考試）, assignment（作業）, participation（參與）
    
    -- 計分設定
    weight DECIMAL(5, 2),                -- 佔總成績比重（%）
    max_score DECIMAL(10, 2),            -- 滿分
    passing_score DECIMAL(10, 2),        -- 及格分數
    
    -- 說明
    description TEXT,
    
    -- 狀態
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 約束條件
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_assessment_types_tenant ON assessment_types(tenant_id);
CREATE INDEX idx_assessment_types_category ON assessment_types(category);

-- 5.2 評量事件（哪一次段考、哪個作業）
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assessment_type_id UUID NOT NULL REFERENCES assessment_types(id) ON DELETE CASCADE,
    
    -- 評量資訊
    title VARCHAR(255) NOT NULL,         -- 例如：「第一次段考」、「第三章作業」
    description TEXT,
    
    -- 時間資訊
    assessment_date DATE,                -- 評量日期
    due_date DATE,                       -- 繳交期限（作業用）
    
    -- 計分設定（可覆蓋 assessment_type 的預設值）
    max_score DECIMAL(10, 2),
    passing_score DECIMAL(10, 2),
    weight DECIMAL(5, 2),
    
    -- 範圍與內容
    chapters TEXT[],                     -- 考試範圍章節
    topics TEXT[],                       -- 涵蓋主題
    
    -- 狀態
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',  -- scheduled, in_progress, completed, cancelled
    is_published BOOLEAN DEFAULT false,  -- 成績是否公布
    
    -- 備註
    notes TEXT,
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX idx_assessments_date ON assessments(assessment_date);
CREATE INDEX idx_assessments_status ON assessments(status);

-- 5.3 成績記錄（連結 assessments）
ALTER TABLE grades
    ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS score DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS max_score DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS percentage DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS letter_grade VARCHAR(5),  -- A+, A, B+, B, C, D, F
    ADD COLUMN IF NOT EXISTS passed BOOLEAN,
    ADD COLUMN IF NOT EXISTS rank INTEGER,             -- 班級排名
    ADD COLUMN IF NOT EXISTS feedback TEXT,            -- 老師評語
    ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_assessment ON grades(student_id, assessment_id);

-- ================================================================
-- 6. LESSON ENHANCEMENT (課程記錄強化)
-- ================================================================

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS course_schedule_id UUID REFERENCES course_schedules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(50) DEFAULT 'regular',  -- regular, makeup, trial, special
    
    -- 課程內容
    ADD COLUMN IF NOT EXISTS topic VARCHAR(255),
    ADD COLUMN IF NOT EXISTS content TEXT,
    ADD COLUMN IF NOT EXISTS homework TEXT,
    ADD COLUMN IF NOT EXISTS materials TEXT[],
    
    -- 教學紀錄
    ADD COLUMN IF NOT EXISTS teaching_notes TEXT,
    ADD COLUMN IF NOT EXISTS student_performance TEXT,
    
    -- 狀態
    ADD COLUMN IF NOT EXISTS lesson_status VARCHAR(50) DEFAULT 'scheduled';  -- scheduled, completed, cancelled

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_schedule ON lessons(course_schedule_id);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON lessons(lesson_type);

-- ================================================================
-- 7. INVOICE ENHANCEMENT (帳單強化)
-- ================================================================

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS billing_period_start DATE,
    ADD COLUMN IF NOT EXISTS billing_period_end DATE,
    ADD COLUMN IF NOT EXISTS sessions_billed INTEGER,
    ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS discount_reason TEXT,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),  -- cash, transfer, credit_card, line_pay
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- ================================================================
-- 8. UTILITY FUNCTIONS & TRIGGERS
-- ================================================================

-- 8.1 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 套用到所有資料表
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_pricing_updated_at BEFORE UPDATE ON course_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_schedules_updated_at BEFORE UPDATE ON course_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_parents_updated_at BEFORE UPDATE ON student_parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_makeup_sessions_updated_at BEFORE UPDATE ON makeup_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_types_updated_at BEFORE UPDATE ON assessment_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8.2 自動計算成績百分比
CREATE OR REPLACE FUNCTION calculate_grade_percentage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.score IS NOT NULL AND NEW.max_score IS NOT NULL AND NEW.max_score > 0 THEN
        NEW.percentage = ROUND((NEW.score / NEW.max_score * 100)::numeric, 2);
        
        -- 判定及格
        IF NEW.passing_score IS NOT NULL THEN
            NEW.passed = NEW.score >= NEW.passing_score;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_grades_percentage BEFORE INSERT OR UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION calculate_grade_percentage();

-- ================================================================
-- 9. SEED DATA (基礎資料)
-- ================================================================

-- 9.1 預設評量類型
INSERT INTO assessment_types (tenant_id, code, name, category, weight, max_score, passing_score) 
VALUES 
    ((SELECT id FROM tenants LIMIT 1), 'MIDTERM', '段考', 'exam', 40.00, 100.00, 60.00),
    ((SELECT id FROM tenants LIMIT 1), 'FINAL', '期末考', 'exam', 40.00, 100.00, 60.00),
    ((SELECT id FROM tenants LIMIT 1), 'QUIZ', '小考', 'exam', 10.00, 100.00, 60.00),
    ((SELECT id FROM tenants LIMIT 1), 'HOMEWORK', '作業', 'assignment', 5.00, 100.00, 60.00),
    ((SELECT id FROM tenants LIMIT 1), 'CLASSWORK', '課堂表現', 'participation', 5.00, 100.00, 60.00)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ================================================================
-- 10. COMMENTS (資料表註解)
-- ================================================================

COMMENT ON TABLE courses IS '課程目錄：定義補習班提供的所有課程（科目、年級、時長）';
COMMENT ON TABLE course_pricing IS '課程定價策略：按時數/月繳/學期計費，支持多級折扣';
COMMENT ON TABLE course_schedules IS '固定週期課表：每週固定時段的排課（例如：每週三 18:00-20:00）';
COMMENT ON TABLE parents IS '家長資料：獨立管理家長聯絡資訊';
COMMENT ON TABLE student_parents IS '學生-家長關係：多對多關係，支持一個家長多個小孩';
COMMENT ON TABLE leave_requests IS '請假申請：學生請假流程與審核';
COMMENT ON TABLE makeup_sessions IS '補課記錄：追蹤補課安排與出席狀況';
COMMENT ON TABLE assessment_types IS '評量類型：段考、小考、作業、課堂表現等類型定義';
COMMENT ON TABLE assessments IS '評量事件：具體的某次段考、某個作業';
COMMENT ON TABLE grades IS '成績記錄：連結到具體的評量事件';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
