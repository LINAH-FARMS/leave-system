-- =============================================================
-- HR Leave Management System - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  emp_code INT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT DEFAULT '',
  department TEXT NOT NULL,
  hire_date TEXT,
  leave_balance REAL DEFAULT 0,
  monthly_balance REAL DEFAULT 0,
  is_manager BOOLEAN DEFAULT FALSE,
  managed_dept TEXT DEFAULT NULL,
  is_hr BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGSERIAL PRIMARY KEY,
  emp_code INT NOT NULL REFERENCES employees(emp_code),
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT DEFAULT '',
  leave_type TEXT NOT NULL DEFAULT 'اعتيادية',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count REAL NOT NULL,
  travel_date TEXT,
  last_work_day TEXT,
  return_date TEXT,
  phone TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  manager_comment TEXT DEFAULT '',
  hr_comment TEXT DEFAULT '',
  reviewed_by TEXT DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEAVE AUDIT LOG
CREATE TABLE IF NOT EXISTS leave_audit (
  id BIGSERIAL PRIMARY KEY,
  leave_id BIGINT REFERENCES leave_requests(id),
  emp_code INT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COLORS & SETTINGS (for department QR colors)
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);

-- Disable RLS for simplicity (auth handled client-side)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Insert default HR admin (change password after first login!)
INSERT INTO employees (emp_code, password_hash, full_name, job_title, department, is_manager, is_hr, leave_balance)
VALUES (1, 'h39c43b7d', 'مدير النظام', 'HR Admin', 'الموارد البشريه', TRUE, TRUE, 30)
ON CONFLICT (emp_code) DO NOTHING;

-- Insert department colors
INSERT INTO settings (key, value) VALUES
  ('color_زراعه', '#4CAF50'),
  ('color_فنيه', '#2196F3'),
  ('color_مخازن', '#FF9800'),
  ('color_الشئون الاداريه', '#9C27B0'),
  ('color_الموارد البشريه', '#E91E63'),
  ('color_امن', '#607D8B'),
  ('color_ميكنه', '#795548')
ON CONFLICT (key) DO NOTHING;
