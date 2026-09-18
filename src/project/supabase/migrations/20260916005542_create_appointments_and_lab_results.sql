/*
# Create appointments and lab_results tables (single-tenant, no auth)

1. New Tables
- `appointments`
  - `id` (uuid, primary key)
  - `topic` (text, not null) — เรื่องนัด
  - `doctor_clinic` (text, not null) — แพทย์/คลินิก
  - `appointment_datetime` (timestamptz, not null) — วันเวลานัดหมาย
  - `hospital` (text, not null) — สถานพยาบาล
  - `special_instructions` (text) — ข้อปฏิบัติพิเศษ (เช่น งดน้ำ-อาหาร)
  - `created_at` (timestamptz, default now())
- `lab_results`
  - `id` (uuid, primary key)
  - `exam_date` (date, not null) — วันที่ตรวจ
  - `fbs` (numeric) — ระดับน้ำตาล (FBS) mg/dL
  - `cholesterol` (numeric) — คอเลสเตอรอล mg/dL
  - `bp_systolic` (integer) — ความดันตัวบน
  - `bp_diastolic` (integer) — ความดันตัวล่าง
  - `file_name` (text) — ชื่อไฟล์ที่อัปโหลด
  - `file_type` (text) — ประเภทไฟล์ (jpg/png/pdf)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant app, no sign-in, data is intentionally shared).
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  doctor_clinic text NOT NULL,
  appointment_datetime timestamptz NOT NULL,
  hospital text NOT NULL,
  special_instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_date date NOT NULL,
  fbs numeric,
  cholesterol numeric,
  bp_systolic integer,
  bp_diastolic integer,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lab_results" ON lab_results;
CREATE POLICY "anon_select_lab_results" ON lab_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_lab_results" ON lab_results;
CREATE POLICY "anon_insert_lab_results" ON lab_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_lab_results" ON lab_results;
CREATE POLICY "anon_update_lab_results" ON lab_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_lab_results" ON lab_results;
CREATE POLICY "anon_delete_lab_results" ON lab_results FOR DELETE
  TO anon, authenticated USING (true);
