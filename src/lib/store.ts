// Local, browser-based data layer. No external database is required so the
// preview runs without any Supabase configuration.

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

export type Profile = {
  full_name: string;
  weight: number | null;
  height: number | null;
};

const KEYS = {
  appointments: 'myhealthcare_appointments',
  labs: 'myhealthcare_lab_results',
  profile: 'myhealthcare_profile',
  doctors: 'myhealthcare_doctors',
  hospitals: 'myhealthcare_hospitals',
  seeded: 'myhealthcare_seeded_v1',
};

const DEFAULT_DOCTORS = ['พญ.อัญชิสา'];
const DEFAULT_HOSPITALS = ['โรงพยาบาลไทยนครินทร์'];

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

/* ---------- Initial seed ---------- */
// Seeds stable starter data exactly once per browser so the app never opens
// empty. It only writes keys that have never been set, and records a
// `seeded` flag so it never overwrites data the user later edits or clears.

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

export function initStore(): void {
  try {
    if (localStorage.getItem(KEYS.seeded)) return;

    if (localStorage.getItem(KEYS.profile) === null) {
      write<Profile>(KEYS.profile, { full_name: 'คุณสมชาย ใจดี', weight: 68, height: 170 });
    }
    if (localStorage.getItem(KEYS.doctors) === null) {
      write<string[]>(KEYS.doctors, DEFAULT_DOCTORS);
    }
    if (localStorage.getItem(KEYS.hospitals) === null) {
      write<string[]>(KEYS.hospitals, DEFAULT_HOSPITALS);
    }
    if (localStorage.getItem(KEYS.appointments) === null) {
      const seed: Appointment[] = [
        {
          id: uid(),
          topic: 'ตรวจสุขภาพประจำปี',
          doctor_clinic: DEFAULT_DOCTORS[0],
          appointment_datetime: daysFromNow(7),
          hospital: DEFAULT_HOSPITALS[0],
          special_instructions: 'งดน้ำงดอาหารก่อนเจาะเลือด 8 ชั่วโมง',
          created_at: new Date().toISOString(),
        },
      ];
      write<Appointment[]>(KEYS.appointments, seed);
    }
    if (localStorage.getItem(KEYS.labs) === null) {
      const seed: LabResult[] = [
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
      write<LabResult[]>(KEYS.labs, seed);
    }

    localStorage.setItem(KEYS.seeded, '1');
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

/* ---------- Appointments ---------- */

export function getAppointments(): Appointment[] {
  return read<Appointment[]>(KEYS.appointments, []).sort((a, b) =>
    a.appointment_datetime.localeCompare(b.appointment_datetime),
  );
}

export function addAppointment(data: AppointmentInsert): Appointment {
  const list = read<Appointment[]>(KEYS.appointments, []);
  const item: Appointment = {
    id: uid(),
    topic: data.topic,
    doctor_clinic: data.doctor_clinic,
    appointment_datetime: data.appointment_datetime,
    hospital: data.hospital,
    special_instructions: data.special_instructions ?? null,
    created_at: new Date().toISOString(),
  };
  write(KEYS.appointments, [...list, item]);
  return item;
}

export function deleteAppointment(id: string): void {
  const list = read<Appointment[]>(KEYS.appointments, []);
  write(KEYS.appointments, list.filter((a) => a.id !== id));
}

/* ---------- Lab results ---------- */

export function getLabResults(): LabResult[] {
  return read<LabResult[]>(KEYS.labs, []).sort((a, b) => b.exam_date.localeCompare(a.exam_date));
}

export function addLabResult(data: LabResultInsert): LabResult {
  const list = read<LabResult[]>(KEYS.labs, []);
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
  write(KEYS.labs, [item, ...list]);
  return item;
}

export function deleteLabResult(id: string): void {
  const list = read<LabResult[]>(KEYS.labs, []);
  write(KEYS.labs, list.filter((r) => r.id !== id));
}

/* ---------- Profile ---------- */

export function getProfile(): Profile {
  return read<Profile>(KEYS.profile, { full_name: '', weight: null, height: null });
}

export function saveProfile(profile: Profile): void {
  write(KEYS.profile, profile);
}

/* ---------- Doctor & hospital options ---------- */

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
