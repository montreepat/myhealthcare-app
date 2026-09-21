import { supabase } from '@/lib/supabase';

// Local cache with optional Supabase synchronization.
// preview runs without any Supabase configuration.
//
// Data is namespaced per family member so multiple people can each keep their
// own weight/height/BMI, appointments and lab history independently.

export type Appointment = {
  id: string;
  topic: string;
  doctor_clinic: string;
  appointment_datetime: string;
  hospital: string;
  special_instructions: string | null;
  created_at: string;
};

export type AppointmentInsert = {
  topic: string;
  doctor_clinic: string;
  appointment_datetime: string;
  hospital: string;
  special_instructions?: string | null;
};

export type LabResult = {
  id: string;
  exam_date: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  hba1c: number | null;
  ldl: number | null;
  hdl: number | null;
  created_at: string;
};

export type LabResultInsert = {
  exam_date: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  hba1c?: number | null;
  ldl?: number | null;
  hdl?: number | null;
};

export type BloodPressureLog = {
  id: string;
  logged_at: string;
  period: 'morning' | 'evening';
  systolic: number;
  diastolic: number;
  pulse: number | null;
  note: string | null;
  created_at: string;
};

export type BloodPressureLogInsert = {
  logged_at: string;
  period: 'morning' | 'evening';
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  note?: string | null;
};

export type Profile = {
  full_name: string;
  weight: number | null;
  height: number | null;
};

export type Medication = {
  id: string;
  name: string;
  strength: string;
  dose: string;
  schedule: string;
  meal_timing: 'before' | 'after' | 'with' | 'any';
  start_date: string;
  end_date: string | null;
  prescriber: string | null;
  hospital: string | null;
  purpose: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
};

export type MedicationInsert = Omit<Medication, 'id' | 'created_at'>;

export type MedicationLog = {
  id: string;
  medication_id: string;
  scheduled_at: string;
  status: 'taken' | 'skipped' | 'missed';
  note: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  activity_date: string;
  activity_type: 'walking' | 'running' | 'other';
  steps: number;
  distance_km: number | null;
  duration_minutes: number | null;
  note: string | null;
  created_at: string;
};

export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>;

// A member of the family. Each has an isolated data namespace plus a stable
// LINE connection OTP so they can bind their own personal LINE account.
export type FamilyMember = {
  id: string;
  full_name: string;
  weight: number | null;
  height: number | null;
  otp: string;
};

const KEYS = {
  members: 'myhealthcare_members',
  activeMember: 'myhealthcare_active_member',
  doctors: 'myhealthcare_doctors',
  hospitals: 'myhealthcare_hospitals',
  seeded: 'myhealthcare_seeded_v3',
  // legacy single-profile keys, migrated into the first member on first run
  legacyProfile: 'myhealthcare_profile',
  legacyAppointments: 'myhealthcare_appointments',
  legacyLabs: 'myhealthcare_lab_results',
};

const DEFAULT_DOCTORS = ['พญ.อัญชิสา'];
const DEFAULT_HOSPITALS = ['โรงพยาบาลไทยนครินทร์'];

function appointmentsKey(memberId: string): string {
  return `myhealthcare_appointments_${memberId}`;
}

function labsKey(memberId: string): string {
  return `myhealthcare_lab_results_${memberId}`;
}

function bpLogsKey(memberId: string): string {
  return `myhealthcare_bp_logs_${memberId}`;
}

function medicationsKey(memberId: string): string {
  return `myhealthcare_medications_${memberId}`;
}

function medicationLogsKey(memberId: string): string {
  return `myhealthcare_medication_logs_${memberId}`;
}

function activityLogsKey(memberId: string): string {
  return `myhealthcare_activity_logs_${memberId}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write/quota errors
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ---------- Initial seed ---------- */
// Seeds stable starter data exactly once per browser so the app never opens
// empty, and migrates any legacy single-profile data into the first family
// member. It records a `seeded` flag so it never overwrites later edits.

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  // to yyyy-MM-ddTHH:mm for datetime-local inputs
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seedAppointments(): Appointment[] {
  return [
    {
      id: uid(),
      topic: 'ตรวจสุขภาพประจำปี',
      doctor_clinic: DEFAULT_DOCTORS[0],
      appointment_datetime: new Date(daysFromNow(7)).toISOString(),
      hospital: DEFAULT_HOSPITALS[0],
      special_instructions: 'งดน้ำงดอาหารก่อนเจาะเลือด 8 ชั่วโมง',
      created_at: new Date().toISOString(),
    },
  ];
}

function seedLabs(): LabResult[] {
  return [
    {
      id: uid(),
      exam_date: isoDaysAgo(30),
      bp_systolic: 120,
      bp_diastolic: 80,
      hba1c: 5.4,
      ldl: 110,
      hdl: 55,
      created_at: new Date().toISOString(),
    },
  ];
}

function seedBpLogs(): BloodPressureLog[] {
  const now = new Date().toISOString();
  const daysAgoAt = (days: number, hour: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return [
    { id: uid(), logged_at: daysAgoAt(1, 7), period: 'morning', systolic: 125, diastolic: 78, pulse: 72, note: 'หลังตื่นนอน', created_at: now },
    { id: uid(), logged_at: daysAgoAt(1, 19), period: 'evening', systolic: 132, diastolic: 85, pulse: 75, note: 'ก่อนนอน', created_at: now },
    { id: uid(), logged_at: daysAgoAt(2, 8), period: 'morning', systolic: 128, diastolic: 82, pulse: 70, note: null, created_at: now },
    { id: uid(), logged_at: daysAgoAt(3, 7), period: 'morning', systolic: 118, diastolic: 76, pulse: 68, note: 'พักผ่อนเพียงพอ', created_at: now },
    { id: uid(), logged_at: daysAgoAt(5, 20), period: 'evening', systolic: 136, diastolic: 88, pulse: 78, note: 'เครียดจากงาน', created_at: now },
  ];
}

export function initStore(): void {
  try {
    if (localStorage.getItem(KEYS.seeded)) return;

    if (localStorage.getItem(KEYS.doctors) === null) {
      write<string[]>(KEYS.doctors, DEFAULT_DOCTORS);
    }
    if (localStorage.getItem(KEYS.hospitals) === null) {
      write<string[]>(KEYS.hospitals, DEFAULT_HOSPITALS);
    }

    if (getMembers().length === 0) {
      const legacyProfile = read<Profile | null>(KEYS.legacyProfile, null);
      const defaultMember: FamilyMember = {
        id: uid(),
        full_name: legacyProfile?.full_name || 'คุณ มนตรี ภัทรเดชวงศ์',
        weight: legacyProfile?.weight ?? 82,
        height: legacyProfile?.height ?? 172,
        otp: generateOtp(),
      };
      write<FamilyMember[]>(KEYS.members, [defaultMember]);
      write<string>(KEYS.activeMember, defaultMember.id);

      const legacyAppointments = read<Appointment[] | null>(KEYS.legacyAppointments, null);
      write<Appointment[]>(
        appointmentsKey(defaultMember.id),
        legacyAppointments ?? seedAppointments(),
      );

      const legacyLabs = read<LabResult[] | null>(KEYS.legacyLabs, null);
      write<LabResult[]>(labsKey(defaultMember.id), legacyLabs ?? seedLabs());

      write<BloodPressureLog[]>(bpLogsKey(defaultMember.id), seedBpLogs());
    }

    localStorage.setItem(KEYS.seeded, '1');
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

/* ---------- Family members ---------- */

export function getMembers(): FamilyMember[] {
  return read<FamilyMember[]>(KEYS.members, []);
}

export function replaceMembersFromOnline(items: Array<Omit<FamilyMember, 'otp'>>): FamilyMember[] {
  const current = getMembers();
  const members = items.map((item) => ({
    ...item,
    otp: current.find((member) => member.id === item.id)?.otp ?? generateOtp(),
  }));
  write<FamilyMember[]>(KEYS.members, members);
  const active = getActiveMemberId();
  if (!members.some((member) => member.id === active) && members[0]) write(KEYS.activeMember, members[0].id);
  return members;
}

export function getActiveMemberId(): string {
  const members = getMembers();
  const stored = read<string | null>(KEYS.activeMember, null);
  if (stored && members.some((m) => m.id === stored)) return stored;
  return members[0]?.id ?? '';
}

export function setActiveMemberId(id: string): void {
  write<string>(KEYS.activeMember, id);
}

export function addMember(name: string): FamilyMember {
  const members = getMembers();
  const member: FamilyMember = {
    id: uid(),
    full_name: name.trim() || 'สมาชิกใหม่',
    weight: null,
    height: null,
    otp: generateOtp(),
  };
  write<FamilyMember[]>(KEYS.members, [...members, member]);
  write<Appointment[]>(appointmentsKey(member.id), []);
  write<LabResult[]>(labsKey(member.id), []);
  write<BloodPressureLog[]>(bpLogsKey(member.id), []);
  write<Medication[]>(medicationsKey(member.id), []);
  write<MedicationLog[]>(medicationLogsKey(member.id), []);
  write<ActivityLog[]>(activityLogsKey(member.id), []);
  const client = supabase;
  if (client) void client.auth.getUser().then(async ({ data }) => {
    if (!data.user) return;
    const household = await client.from('households').select('id').eq('owner_user_id', data.user.id).maybeSingle();
    if (household.data) await client.from('family_profiles').insert({ id: member.id, household_id: household.data.id, full_name: member.full_name, role: 'member' });
  });
  return member;
}

/* ---------- Walking / running activity (per active member) ---------- */

export function getActivityLogs(): ActivityLog[] {
  return read<ActivityLog[]>(activityLogsKey(getActiveMemberId()), []).sort((a, b) =>
    b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at),
  );
}

export function addActivityLog(data: ActivityLogInsert): ActivityLog {
  const key = activityLogsKey(getActiveMemberId());
  const list = read<ActivityLog[]>(key, []);
  const item: ActivityLog = { ...data, id: uid(), created_at: new Date().toISOString() };
  write(key, [item, ...list]);
  if (supabase) void supabase.from('activity_logs').insert({ ...item, profile_id: getActiveMemberId() });
  return item;
}

export function deleteActivityLog(id: string): void {
  const key = activityLogsKey(getActiveMemberId());
  write(key, read<ActivityLog[]>(key, []).filter((item) => item.id !== id));
  if (supabase) void supabase.from('activity_logs').delete().eq('id', id);
}

/* ---------- Medications (per active member) ---------- */

export function getMedications(): Medication[] {
  return read<Medication[]>(medicationsKey(getActiveMemberId()), []).sort((a, b) =>
    Number(b.active) - Number(a.active) || b.created_at.localeCompare(a.created_at),
  );
}

export function addMedication(data: MedicationInsert): Medication {
  const key = medicationsKey(getActiveMemberId());
  const list = read<Medication[]>(key, []);
  const item: Medication = { ...data, id: uid(), created_at: new Date().toISOString() };
  write(key, [item, ...list]);
  if (supabase) void supabase.from('medications').insert({ ...item, profile_id: getActiveMemberId() });
  return item;
}

export function updateMedication(id: string, patch: Partial<MedicationInsert>): void {
  const key = medicationsKey(getActiveMemberId());
  const list = read<Medication[]>(key, []);
  write(key, list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  if (supabase) void supabase.from('medications').update(patch).eq('id', id);
}

export function deleteMedication(id: string): void {
  const key = medicationsKey(getActiveMemberId());
  write(key, read<Medication[]>(key, []).filter((item) => item.id !== id));
  if (supabase) void supabase.from('medications').delete().eq('id', id);
}

export function getMedicationLogs(): MedicationLog[] {
  return read<MedicationLog[]>(medicationLogsKey(getActiveMemberId()), []).sort((a, b) =>
    b.scheduled_at.localeCompare(a.scheduled_at),
  );
}

export function addMedicationLog(
  medicationId: string,
  status: MedicationLog['status'],
  scheduledAt = new Date().toISOString(),
  note: string | null = null,
): MedicationLog {
  const key = medicationLogsKey(getActiveMemberId());
  const list = read<MedicationLog[]>(key, []);
  const item: MedicationLog = {
    id: uid(), medication_id: medicationId, scheduled_at: scheduledAt,
    status, note, created_at: new Date().toISOString(),
  };
  write(key, [item, ...list]);
  if (supabase) void supabase.from('medication_logs').insert(item);
  return item;
}

/* ---------- Backup / restore ---------- */

export type StoreBackup = {
  format: 'myhealthcare-backup';
  version: 1;
  exported_at: string;
  data: Record<string, unknown>;
};

export function createBackup(): StoreBackup {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith('myhealthcare_')) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
  }
  return { format: 'myhealthcare-backup', version: 1, exported_at: new Date().toISOString(), data };
}

export function restoreBackup(backup: StoreBackup): void {
  if (backup.format !== 'myhealthcare-backup' || backup.version !== 1 || !backup.data) {
    throw new Error('ไฟล์สำรองไม่ถูกต้อง');
  }
  Object.entries(backup.data).forEach(([key, value]) => {
    if (key.startsWith('myhealthcare_')) localStorage.setItem(key, JSON.stringify(value));
  });
}

export function updateMember(
  id: string,
  patch: Partial<Pick<FamilyMember, 'full_name' | 'weight' | 'height'>>,
): FamilyMember[] {
  const members = getMembers().map((m) => (m.id === id ? { ...m, ...patch } : m));
  write<FamilyMember[]>(KEYS.members, members);
  if (supabase) void supabase.from('family_profiles').update(patch).eq('id', id);
  return members;
}

export function getActiveOtp(): string {
  const id = getActiveMemberId();
  return getMembers().find((m) => m.id === id)?.otp ?? '';
}

/* ---------- Appointments (per active member) ---------- */

export function getAppointments(): Appointment[] {
  const key = appointmentsKey(getActiveMemberId());
  return read<Appointment[]>(key, []).sort((a, b) =>
    a.appointment_datetime.localeCompare(b.appointment_datetime),
  );
}

export function addAppointment(data: AppointmentInsert): Appointment {
  const key = appointmentsKey(getActiveMemberId());
  const list = read<Appointment[]>(key, []);
  const item: Appointment = {
    id: uid(),
    topic: data.topic,
    doctor_clinic: data.doctor_clinic,
    appointment_datetime: data.appointment_datetime,
    hospital: data.hospital,
    special_instructions: data.special_instructions ?? null,
    created_at: new Date().toISOString(),
  };
  write(key, [...list, item]);
  if (supabase) void supabase.from('health_appointments').insert({ ...item, profile_id: getActiveMemberId() });
  return item;
}

export function deleteAppointment(id: string): void {
  const key = appointmentsKey(getActiveMemberId());
  const list = read<Appointment[]>(key, []);
  write(key, list.filter((a) => a.id !== id));
  if (supabase) void supabase.from('health_appointments').delete().eq('id', id);
}

/* ---------- Lab results (per active member) ---------- */

export function getLabResults(): LabResult[] {
  const key = labsKey(getActiveMemberId());
  return read<LabResult[]>(key, []).sort((a, b) => b.exam_date.localeCompare(a.exam_date));
}

export function addLabResult(data: LabResultInsert): LabResult {
  const key = labsKey(getActiveMemberId());
  const list = read<LabResult[]>(key, []);
  const item: LabResult = {
    id: uid(),
    exam_date: data.exam_date,
    bp_systolic: data.bp_systolic ?? null,
    bp_diastolic: data.bp_diastolic ?? null,
    hba1c: data.hba1c ?? null,
    ldl: data.ldl ?? null,
    hdl: data.hdl ?? null,
    created_at: new Date().toISOString(),
  };
  write(key, [item, ...list]);
  return item;
}

export function deleteLabResult(id: string): void {
  const key = labsKey(getActiveMemberId());
  const list = read<LabResult[]>(key, []);
  write(key, list.filter((r) => r.id !== id));
}

/* ---------- Blood pressure logs (per active member) ---------- */

export function getBpLogs(): BloodPressureLog[] {
  const key = bpLogsKey(getActiveMemberId());
  return read<BloodPressureLog[]>(key, []).sort((a, b) =>
    b.logged_at.localeCompare(a.logged_at),
  );
}

export function addBpLog(data: BloodPressureLogInsert): BloodPressureLog {
  const key = bpLogsKey(getActiveMemberId());
  const list = read<BloodPressureLog[]>(key, []);
  const item: BloodPressureLog = {
    id: uid(),
    logged_at: data.logged_at,
    period: data.period,
    systolic: data.systolic,
    diastolic: data.diastolic,
    pulse: data.pulse ?? null,
    note: data.note ?? null,
    created_at: new Date().toISOString(),
  };
  write(key, [item, ...list]);
  if (supabase) void supabase.from('blood_pressure_logs').insert({ ...item, profile_id: getActiveMemberId() });
  return item;
}

export function deleteBpLog(id: string): void {
  const key = bpLogsKey(getActiveMemberId());
  const list = read<BloodPressureLog[]>(key, []);
  write(key, list.filter((l) => l.id !== id));
  if (supabase) void supabase.from('blood_pressure_logs').delete().eq('id', id);
}

export async function syncProfileWithOnline(profileId: string): Promise<void> {
  if (!supabase || !profileId) return;
  const appointments = read<Appointment[]>(appointmentsKey(profileId), []);
  const medications = read<Medication[]>(medicationsKey(profileId), []);
  const medicationLogs = read<MedicationLog[]>(medicationLogsKey(profileId), []);
  const bpLogs = read<BloodPressureLog[]>(bpLogsKey(profileId), []);
  const activityLogs = read<ActivityLog[]>(activityLogsKey(profileId), []);

  if (appointments.length) await supabase.from('health_appointments').upsert(appointments.map((x) => ({ ...x, profile_id: profileId })), { onConflict: 'id' });
  if (medications.length) await supabase.from('medications').upsert(medications.map((x) => ({ ...x, profile_id: profileId })), { onConflict: 'id' });
  if (medicationLogs.length) await supabase.from('medication_logs').upsert(medicationLogs, { onConflict: 'id' });
  if (bpLogs.length) await supabase.from('blood_pressure_logs').upsert(bpLogs.map((x) => ({ ...x, profile_id: profileId })), { onConflict: 'id' });
  if (activityLogs.length) await supabase.from('activity_logs').upsert(activityLogs.map((x) => ({ ...x, profile_id: profileId })), { onConflict: 'id' });

  const [a, m, b, act] = await Promise.all([
    supabase.from('health_appointments').select('id,topic,doctor_clinic,appointment_datetime,hospital,special_instructions,created_at').eq('profile_id', profileId),
    supabase.from('medications').select('id,name,strength,dose,schedule,meal_timing,start_date,end_date,prescriber,hospital,purpose,note,active,created_at').eq('profile_id', profileId),
    supabase.from('blood_pressure_logs').select('id,logged_at,period,systolic,diastolic,pulse,note,created_at').eq('profile_id', profileId),
    supabase.from('activity_logs').select('id,activity_date,activity_type,steps,distance_km,duration_minutes,note,created_at').eq('profile_id', profileId),
  ]);
  if (!a.error) write(appointmentsKey(profileId), a.data as Appointment[]);
  if (!m.error) {
    write(medicationsKey(profileId), m.data as Medication[]);
    const ids = m.data.map((item) => item.id);
    if (ids.length) {
      const ml = await supabase.from('medication_logs').select('id,medication_id,scheduled_at,status,note,created_at').in('medication_id', ids);
      if (!ml.error) write(medicationLogsKey(profileId), ml.data as MedicationLog[]);
    }
  }
  if (!b.error) write(bpLogsKey(profileId), b.data as BloodPressureLog[]);
  if (!act.error) write(activityLogsKey(profileId), act.data as ActivityLog[]);
}

/* ---------- Profile (maps to the active member) ---------- */

export function getProfile(): Profile {
  const id = getActiveMemberId();
  const member = getMembers().find((m) => m.id === id);
  if (!member) return { full_name: '', weight: null, height: null };
  return { full_name: member.full_name, weight: member.weight, height: member.height };
}

export function saveProfile(profile: Profile): void {
  updateMember(getActiveMemberId(), {
    full_name: profile.full_name,
    weight: profile.weight,
    height: profile.height,
  });
}

/* ---------- Doctor & hospital options (shared across members) ---------- */

export function getDoctors(): string[] {
  return read<string[]>(KEYS.doctors, DEFAULT_DOCTORS);
}

export function addDoctor(name: string): string[] {
  const list = getDoctors();
  const trimmed = name.trim();
  if (!trimmed || list.includes(trimmed)) return list;
  const next = [...list, trimmed];
  write(KEYS.doctors, next);
  return next;
}

export function getHospitals(): string[] {
  return read<string[]>(KEYS.hospitals, DEFAULT_HOSPITALS);
}

export function addHospital(name: string): string[] {
  const list = getHospitals();
  const trimmed = name.trim();
  if (!trimmed || list.includes(trimmed)) return list;
  const next = [...list, trimmed];
  write(KEYS.hospitals, next);
  return next;
}
