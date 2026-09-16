import { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Stethoscope, Building2, Clock, UtensilsCrossed, X, Trash2, AlertCircle } from 'lucide-react';
import { supabase, type Appointment, type AppointmentInsert } from '@/lib/supabase';

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDateThai(dt: string): { date: string; time: string; day: string } {
  const d = new Date(dt);
  const dayName = THAI_DAYS[d.getDay()];
  const date = `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
  return { date, time, day: dayName };
}

function toLocalInputValue(date: Date): string {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AppointmentsTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AppointmentInsert>({
    topic: '',
    doctor_clinic: '',
    appointment_datetime: '',
    hospital: '',
    special_instructions: '',
  });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_datetime', { ascending: true });
    if (err) {
      setError('ไม่สามารถดึงข้อมูลนัดหมายได้');
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic || !form.doctor_clinic || !form.appointment_datetime || !form.hospital) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from('appointments').insert({
      topic: form.topic,
      doctor_clinic: form.doctor_clinic,
      appointment_datetime: new Date(form.appointment_datetime).toISOString(),
      hospital: form.hospital,
      special_instructions: form.special_instructions || null,
    });
    setSubmitting(false);
    if (err) {
      setError('บันทึกนัดหมายไม่สำเร็จ กรุณาลองอีกครั้ง');
      return;
    }
    setShowModal(false);
    setForm({ topic: '', doctor_clinic: '', appointment_datetime: '', hospital: '', special_instructions: '' });
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('appointments').delete().eq('id', id);
    if (!err) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.appointment_datetime) >= now);
  const past = appointments.filter((a) => new Date(a.appointment_datetime) < now);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">ตารางนัดหมาย</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          เพิ่มนัดหมายใหม่
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && upcoming.length === 0 && past.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-400">ยังไม่มีนัดหมาย กดปุ่ม "เพิ่มนัดหมายใหม่" เพื่อเริ่ม</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map((apt, idx) => {
            const { date, time, day } = formatDateThai(apt.appointment_datetime);
            return (
              <div
                key={apt.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-brand-500" />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex-1 space-y-2.5">
                    <div>
                      <h3 className="font-semibold text-slate-800">{apt.topic}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {apt.doctor_clinic}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {apt.hospital}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {day} {date} • {time}
                      </span>
                    </div>
                    {apt.special_instructions && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        <UtensilsCrossed className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{apt.special_instructions}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">นัดหมายที่ผ่านไปแล้ว</p>
          <div className="space-y-2">
            {past.map((apt) => {
              const { date, time, day } = formatDateThai(apt.appointment_datetime);
              return (
                <div key={apt.id} className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-600 line-through">{apt.topic}</h3>
                      <p className="text-xs text-slate-400">
                        {apt.doctor_clinic} • {day} {date} • {time}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(apt.id)}
                      className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slide-up sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">เพิ่มนัดหมายใหม่</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">เรื่องนัด</label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="เช่น ตรวจสุขภาพประจำปี"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">แพทย์/คลินิก</label>
                <input
                  type="text"
                  value={form.doctor_clinic}
                  onChange={(e) => setForm({ ...form, doctor_clinic: e.target.value })}
                  placeholder="เช่น น.พ. สมชาย คลินิกหัวใจ"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">วันเวลานัดหมาย</label>
                <input
                  type="datetime-local"
                  value={form.appointment_datetime}
                  onChange={(e) => setForm({ ...form, appointment_datetime: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">สถานพยาบาล</label>
                <input
                  type="text"
                  value={form.hospital}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                  placeholder="เช่น โรงพยาบาลจุฬาลงกรณ์"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ข้อปฏิบัติพิเศษ</label>
                <textarea
                  value={form.special_instructions || ''}
                  onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
                  placeholder="เช่น งดน้ำ-อาหาร 8 ชั่วโมงก่อนนัด"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกนัดหมาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
