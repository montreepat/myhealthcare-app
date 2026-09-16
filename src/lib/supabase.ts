import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Appointment = {
  id: string;
  topic: string;
  doctor_clinic: string;
  appointment_datetime: string;
  hospital: string;
  special_instructions: string | null;
  created_at: string;
};

export type LabResult = {
  id: string;
  exam_date: string;
  fbs: number | null;
  cholesterol: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
};

export type AppointmentInsert = {
  topic: string;
  doctor_clinic: string;
  appointment_datetime: string;
  hospital: string;
  special_instructions?: string | null;
};

export type LabResultInsert = {
  exam_date: string;
  fbs?: number | null;
  cholesterol?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  file_name?: string | null;
  file_type?: string | null;
};
