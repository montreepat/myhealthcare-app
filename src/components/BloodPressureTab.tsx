import { useMemo, useState } from 'react';
import { Activity, Plus, X, Trash2, HeartPulse, Sun, Moon, AlertCircle, TrendingUp } from 'lucide-react';
import { getBpLogs, addBpLog, deleteBpLog, type BpLog, type BpLogInsert, type BpPeriod } from '@/lib/store';
import { assessBloodPressure } from '@/lib/health';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDateTimeThai(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} · ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
}

// Local now formatted for a datetime-local input (yyyy-MM-ddTHH:mm).
function nowForInput(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function periodFromDate(dateStr: string): BpPeriod {
  const h = new Date(dateStr).getHours();
  return h < 12 ? 'morning' : 'evening';
}

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function emptyForm() {
  const measured_at = nowForInput();
  return {
    measured_at,
    period: periodFromDate(measured_at) as BpPeriod,
    systolic: '',
    diastolic: '',
    pulse: '',
    note: '',
  };
}

const NOTE_SUGGESTIONS = ['หลังตื่นนอน', 'ก่อนนอน', 'หลังออกกำลังกาย', 'รู้สึกมึนหัว'];

export default function BloodPressureTab() {
  const [logs, setLogs] = useState<BpLog[]>(() => getBpLogs());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => setLogs(getBpLogs());

  const weekly = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = logs.filter((l) => new Date(l.measured_at).getTime() >= cutoff);
    if (recent.length === 0) return null;
    const sum = recent.reduce(
      (acc, l) => {
        acc.sys += l.systolic;
        acc.dia += l.diastolic;
        if (l.pulse !== null) {
          acc.pulse += l.pulse;
          acc.pulseCount += 1;
        }
        return acc;
      },
      { sys: 0, dia: 0, pulse: 0, pulseCount: 0 },
    );
    const sys = Math.round(sum.sys / recent.length);
    const dia = Math.round(sum.dia / recent.length);
    const pulse = sum.pulseCount > 0 ? Math.round(sum.pulse / sum.pulseCount) : null;
    return { count: recent.length, sys, dia, pulse, assessment: assessBloodPressure(sys, dia) };
  }, [logs]);

  const parsedSys = numOrNull(form.systolic);
  const parsedDia = numOrNull(form.diastolic);
  const livePreview =
    parsedSys !== null && parsedDia !== null ? assessBloodPressure(parsedSys, parsedDia) : null;

  const openModal = () => {
    setForm(emptyForm());
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
  };

  const handleSave = () => {
    if (parsedSys === null || parsedDia === null) {
      setError('กรุณากรอกค่าความดันตัวบนและตัวล่าง');
      return;
    }
    if (parsedSys <= 0 || parsedDia <= 0 || parsedSys > 300 || parsedDia > 200) {
      setError('ค่าความดันไม่อยู่ในช่วงที่ถูกต้อง');
      return;
    }
    if (!form.measured_at) {
      setError('กรุณาเลือกวันที่และเวลา');
      return;
    }
    const payload: BpLogInsert = {
      measured_at: new Date(form.measured_at).toISOString(),
      period: form.period,
      systolic: parsedSys,
      diastolic: parsedDia,
      pulse: numOrNull(form.pulse),
      note: form.note.trim() || null,
    };
    addBpLog(payload);
    closeModal();
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteBpLog(id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">บันทึกความดัน</h2>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          บันทึกความดัน
        </button>
      </div>

      {weekly && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-semibold text-slate-700">ค่าเฉลี่ยสัปดาห์นี้ (7 วันล่าสุด)</span>
            <span className="ml-auto text-xs text-slate-400">{weekly.count} รายการ</span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold leading-none text-slate-800">
                {weekly.sys}
                <span className="text-slate-300">/</span>
                {weekly.dia}
                <span className="ml-1 text-sm font-normal text-slate-400">mmHg</span>
              </p>
              {weekly.pulse !== null && (
                <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                  ชีพจรเฉลี่ย {weekly.pulse} bpm
                </p>
              )}
            </div>
            <span
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${weekly.assessment.bg} ${weekly.assessment.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${weekly.assessment.bar}`} />
              {weekly.assessment.label}
            </span>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-400">ยังไม่มีบันทึกความดัน กดปุ่ม "บันทึกความดัน" เพื่อเริ่ม</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log, idx) => {
            const a = assessBloodPressure(log.systolic, log.diastolic);
            return (
              <div
                key={log.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md animate-slide-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 ${a.bar}`} />
                <div className="pl-2">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        {log.period === 'morning' ? (
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-indigo-500" />
                        )}
                        {formatDateTimeThai(log.measured_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.bg} ${a.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${a.bar}`} />
                        {a.label}
                      </span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        aria-label="ลบบันทึก"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end gap-5">
                    <p className="text-2xl font-bold leading-none text-slate-800">
                      {log.systolic}
                      <span className="text-slate-300">/</span>
                      {log.diastolic}
                      <span className="ml-1 text-xs font-normal text-slate-400">mmHg</span>
                    </p>
                    {log.pulse !== null && (
                      <p className="flex items-center gap-1 text-sm text-slate-500">
                        <HeartPulse className="h-4 w-4 text-rose-400" />
                        {log.pulse} bpm
                      </p>
                    )}
                  </div>

                  {log.note && <p className="mt-2 text-sm text-slate-500">📝 {log.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl animate-slide-up sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">บันทึกความดันโลหิต</h3>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">วันที่และเวลา</label>
                <input
                  type="datetime-local"
                  value={form.measured_at}
                  onChange={(e) =>
                    setForm({ ...form, measured_at: e.target.value, period: periodFromDate(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, period: 'morning' })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      form.period === 'morning'
                        ? 'border-amber-300 bg-amber-50 text-amber-600'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    เช้า
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, period: 'evening' })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      form.period === 'evening'
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    เย็น
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ตัวบน (SYS)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.systolic}
                    onChange={(e) => setForm({ ...form, systolic: e.target.value })}
                    placeholder="120"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">mmHg</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ตัวล่าง (DIA)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.diastolic}
                    onChange={(e) => setForm({ ...form, diastolic: e.target.value })}
                    placeholder="80"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">mmHg</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ชีพจร (Pulse)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.pulse}
                  onChange={(e) => setForm({ ...form, pulse: e.target.value })}
                  placeholder="72"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-1 text-xs text-slate-400">bpm (ไม่บังคับ)</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">โน้ตช่วยจำ</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="เช่น หลังตื่นนอน, ก่อนนอน"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {NOTE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, note: s })}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {livePreview && (
                <div className={`rounded-xl border ${livePreview.ring} ${livePreview.bg} p-4`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${livePreview.bar}`} />
                    <span className={`text-sm font-semibold ${livePreview.text}`}>{livePreview.label}</span>
                  </div>
                  <p className={`mt-1.5 text-sm leading-relaxed ${livePreview.text}`}>{livePreview.advice}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
                >
                  บันทึกความดัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
