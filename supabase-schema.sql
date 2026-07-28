-- =============================================================
-- HR Leave Management System - Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. LEAVE REQUESTS TABLE (primary store for leave data)
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  emp_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT DEFAULT '',
  leave_type TEXT NOT NULL DEFAULT 'اعتيادية',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count REAL NOT NULL,
  travel_date TEXT,
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

-- 2. LEAVE AUDIT LOG
CREATE TABLE IF NOT EXISTS leave_audit (
  id BIGSERIAL PRIMARY KEY,
  leave_id TEXT REFERENCES leave_requests(id),
  emp_code TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (required for publishable key)
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_audit ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (internal system)
CREATE POLICY allow_all_leave_requests ON leave_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY allow_all_leave_audit ON leave_audit
  FOR ALL USING (true) WITH CHECK (true);

-- Grant table permissions to anon role (used by publishable key)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
