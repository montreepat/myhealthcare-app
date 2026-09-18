import { useMemo, useState } from 'react';
import { HeartPulse, Plus, X, Trash2, CircleAlert as AlertCircle, Activity, Sun, Moon, TrendingUp, Notebook, Clock, MessageCircle, Loader as Loader2, CircleCheck as CheckCircle2, CircleX } from 'lucide-react';
import {
  getBpLogs,
  addBpLog,
  deleteBpLog,
  type BloodPressureLog,
  type BloodPressureLogInsert,
} from '@/lib/store';
import { assessBp } from '@/lib/health';
import { sendBpLineNotification } from '@/lib/lineNotify';
import { useProfiles } from '@/hooks/useProfiles';

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDateTimeThai(iso: string): { date: string; time: string; day: string } {
  const d = new Date(iso);
  return {
    day: THAI_DAYS[d.getDay()],
    date: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`,
  };
}

function nowLocalDatetime(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  logged_at: string;
  period: 'morning' | 'evening';
  systolic: string;
  diastolic: string;
  pulse: string;
  note: string;
  notifyLine: boolean;
};

function makeEmptyForm(): FormState {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    logged_at: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    period: d.getHours() < 12 ? 'morning' : 'evening',
    systolic: '',
    diastolic: '',
    pulse: '',
    note: '',
    notifyLine: true,
  };
}

const BloodPressureTab = () => {
  const { activeMember } = useProfiles();
  const [logs, setLogs] = useState<BloodPressureLog[]>(() => getBpLogs());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(makeEmptyForm);
  const [lineStatus, setLineStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const refresh = () => setLogs(getBpLogs());

  const handleDatetimeChange = (value: string) => {
    const hour = parseInt(value.split('T')[1]?.split(':')[0] ?? '12', 10);
    setForm((f) => ({ ...f, logged_at: value, period: hour < 12 ? 'morning' : 'evening' }));
  };

  const sysNum = form.systolic.trim() !== '' ? Number(form.systolic) : null;
  const diaNum = form.diastolic.trim() !== '' ? Number(form.diastolic) : null;
  const liveAssessment =
    sysNum !== null && diaNum !== null && sysNum > 0 && diaNum > 0 ? assessBp(sysNum, diaNum) : null;

  const closeModal = () => {
    setShowModal(false);
    setForm(makeEmptyForm());
    setError(null);
    setLineStatus('idle');
  };

  const handleSave = async () => {
    if (!form.logged_at) {
      setError('กรุณาเลือกวันเวลา');
      return;
    }
    if (sysNum === null || sysNum <= 0 || diaNum === null || diaNum <= 0) {
      setError('กรุณากรอกค่าความดันตัวบนและตัวล่างให้ถูกต้อง');
      return;
    }
    const pulseNum = form.pulse.trim() !== '' ? Number(form.pulse) : null;
    const payload: BloodPressureLogInsert = {
      logged_at: new Date(form.logged_at).toISOString(),
      period: form.period,
      systolic: sysNum,
      diastolic: diaNum,
      pulse: pulseNum !== null && pulseNum > 0 ? pulseNum : null,
      note: form.note.trim() || null,
    };
    addBpLog(payload);
    refresh();

    if (form.notifyLine) {
      setLineStatus('sending');
      const assessment = assessBp(sysNum, diaNum);
      const result = await sendBpLineNotification({
        otp: activeMember?.otp ?? '',
        memberName: activeMember?.full_name ?? '',
        dateTime: payload.logged_at,
        period: payload.period,
        systolic: sysNum,
        diastolic: diaNum,
        pulse: payload.pulse ?? null,
        note: payload.note,
        assessmentLabel: assessment.label,
        advice: assessment.advice,
      });
      setLineStatus(result.ok ? 'sent' : 'failed');
      closeModal();
    } else {
      closeModal();
    }
  };

  const handleDelete = (id: string) => {
    deleteBpLog(id);
    refresh();
  };

  const weeklyAvg = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = logs.filter((l) => new Date(l.logged_at) >= sevenDaysAgo);
    if (recent.length === 0) return null;
    const avgSys = Math.round(recent.reduce((s, l) => s + l.systolic, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((s, l) => s + l.diastolic, 0) / recent.length);
    const withPulse = recent.filter((l) => l.pulse !== null);
    const avgPulse =
      withPulse.length > 0
        ? Math.round(withPulse.reduce((s, l) => s + (l.pulse ?? 0), 0) / withPulse.length)
        : null;
    return { avgSys, avgDia, avgPulse, count: recent.length, assessment: assessBp(avgSys, avgDia) };
  }, [logs]);

  const latest = logs[0];
  const latestAssessment = latest ? assessBp(latest.systolic, latest.diastolic) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">บันทึกความดันโลหิต</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          บันทึกความดัน
        </button>
      </div>

      {/* Stats: weekly average + latest */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {weeklyAvg && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-slide-up">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <TrendingUp className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">ค่าเฉลี่ย 7 วันล่าสุด</h3>
                  <p className="text-xs text-slate-400">{weeklyAvg.count} ครั้งในสัปดาห์นี้</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-2xl font-bold ${weeklyAvg.assessment.textColor}`}>
                    {weeklyAvg.avgSys}/{weeklyAvg.avgDia}
                    <span className="ml-1 text-xs font-normal text-slate-400">mmHg</span>
                  </p>
                  {weeklyAvg.avgPulse !== null && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      ชีพจรเฉลี่ย {weeklyAvg.avgPulse} bpm
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full ${weeklyAvg.assessment.bgColor} px-2.5 py-1 text-xs font-semibold ${weeklyAvg.assessment.textColor}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${weeklyAvg.assessment.barColor}`} />
                  {weeklyAvg.assessment.label}
                </span>
              </div>
            </div>
          )}

          {latest && latestAssessment && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm animate-slide-up">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50">
                  <HeartPulse className="h-4 w-4 text-accent-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">บันทึกล่าสุด</h3>
                  <p className="text-xs text-slate-400">
                    {latest.period === 'morning' ? 'ช่วงเช้า' : 'ช่วงเย็น'} •{' '}
                    {formatDateTimeThai(latest.logged_at).date}
                  </p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-2xl font-bold ${latestAssessment.textColor}`}>
                    {latest.systolic}/{latest.diastolic}
                    <span className="ml-1 text-xs font-normal text-slate-400">mmHg</span>
                  </p>
                  {latest.pulse !== null && (
                    <p className="mt-0.5 text-xs text-slate-500">ชีพจร {latest.pulse} bpm</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full ${latestAssessment.bgColor} px-2.5 py-1 text-xs font-semibold ${latestAssessment.textColor}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${latestAssessment.barColor}`} />
                  {latestAssessment.label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HeartPulse className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-400">ยังไม่มีบันทึกความดัน กดปุ่ม "บันทึกความดัน" เพื่อเริ่ม</p>
        </div>
      )}

      {/* History */}
      {logs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            ประวัติการบันทึก
          </p>
          <div className="space-y-2.5">
            {logs.map((log, idx) => {
              const a = assessBp(log.systolic, log.diastolic);
              const { date, time, day } = formatDateTimeThai(log.logged_at);
              return (
                <div
                  key={log.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md animate-slide-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className={`absolute left-0 top-0 h-full w-1.5 ${a.barColor}`} />
                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              log.period === 'morning'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {log.period === 'morning' ? (
                              <Sun className="h-3 w-3" />
                            ) : (
                              <Moon className="h-3 w-3" />
                            )}
                            {log.period === 'morning' ? 'ช่วงเช้า' : 'ช่วงเย็น'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {day} {date} • {time}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`text-2xl font-bold ${a.textColor}`}>
                            {log.systolic}
                            <span className="text-slate-300">/</span>
                            {log.diastolic}
                            <span className="ml-1 text-xs font-normal text-slate-400">mmHg</span>
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full ${a.bgColor} px-2 py-0.5 text-xs font-semibold ${a.textColor}`}
                          >
                            {a.label}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                          {log.pulse !== null && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Activity className="h-3 w-3 text-slate-400" />
                              ชีพจร {log.pulse} bpm
                            </span>
                          )}
                          {log.note && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Notebook className="h-3 w-3 text-slate-400" />
                              {log.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
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
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">วันเวลาที่วัด</label>
                <input
                  type="datetime-local"
                  value={form.logged_at}
                  onChange={(e) => handleDatetimeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ช่วงเวลา</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, period: 'morning' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      form.period === 'morning'
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    ช่วงเช้า
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, period: 'evening' }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      form.period === 'evening'
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    ช่วงเย็น
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    ความดันตัวบน (SYS)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.systolic}
                    onChange={(e) => setForm((f) => ({ ...f, systolic: e.target.value }))}
                    placeholder="120"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">mmHg</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    ความดันตัวล่าง (DIA)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.diastolic}
                    onChange={(e) => setForm((f) => ({ ...f, diastolic: e.target.value }))}
                    placeholder="80"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">mmHg</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ชีพจร (Pulse)</label>
                <div className="relative">
                  <Activity className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.pulse}
                    onChange={(e) => setForm((f) => ({ ...f, pulse: e.target.value }))}
                    placeholder="72"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">bpm (ไม่บังคับ)</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">โน้ตช่วยจำ</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="เช่น หลังตื่นนอน, ก่อนนอน, รู้สึกมึนหัว"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {liveAssessment && (
                <div
                  className={`rounded-xl border ${liveAssessment.borderColor} ${liveAssessment.bgColor} p-4 animate-scale-in`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">ผลประเมินทันที</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold ${liveAssessment.textColor}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${liveAssessment.barColor}`} />
                      {liveAssessment.label}
                    </span>
                  </div>
                  <div className="mb-3 flex h-2 overflow-hidden rounded-full">
                    <div className={`flex-1 ${liveAssessment.level === 'normal' ? 'bg-emerald-400' : 'bg-emerald-200'}`} />
                    <div className={`flex-1 ${liveAssessment.level === 'elevated' ? 'bg-amber-400' : 'bg-amber-200'}`} />
                    <div className={`flex-1 ${liveAssessment.level === 'stage1' ? 'bg-orange-400' : 'bg-orange-200'}`} />
                    <div className={`flex-1 ${liveAssessment.level === 'stage2' ? 'bg-red-400' : 'bg-red-200'}`} />
                  </div>
                  <p className={`text-sm leading-relaxed ${liveAssessment.textColor}`}>
                    {liveAssessment.advice}
                  </p>
                </div>
              )}

              {/* LINE notification toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">ส่งแจ้งเตือนเข้า LINE ด้วย</p>
                    <p className="text-xs text-slate-400">ส่งสรุปผลไปยัง LINE ของ {activeMember?.full_name ?? 'สมาชิก'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.notifyLine}
                  onClick={() => setForm((f) => ({ ...f, notifyLine: !f.notifyLine }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    form.notifyLine ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
                      form.notifyLine ? 'translate-x-5.5' : 'translate-x-1'
                    }`}
                    style={{
                      height: '1.125rem',
                      width: '1.125rem',
                      transform: form.notifyLine ? 'translateX(1.375rem)' : 'translateX(0.25rem)',
                    }}
                  />
                </button>
              </div>

              {/* LINE send status */}
              {lineStatus === 'sending' && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600 animate-fade-in">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  กำลังส่งแจ้งเตือนไปยัง LINE...
                </div>
              )}
              {lineStatus === 'sent' && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ส่งแจ้งเตือนไปยัง LINE เรียบร้อยแล้ว
                </div>
              )}
              {lineStatus === 'failed' && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-600 animate-fade-in">
                  <CircleX className="h-4 w-4 shrink-0" />
                  บันทึกสำเร็จ แต่ส่ง LINE ไม่สำเร็จ (อาจยังไม่ได้เชื่อมต่อ LINE)
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
                  disabled={lineStatus === 'sending'}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={lineStatus === 'sending'}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                  {lineStatus === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    'บันทึก'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodPressureTab;