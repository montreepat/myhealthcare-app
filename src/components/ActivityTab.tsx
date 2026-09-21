import { useEffect, useMemo, useState } from 'react';
import { BellRing, Footprints, Plus, Trash2, X } from 'lucide-react';
import { addActivityLog, deleteActivityLog, getActivityLogs, type ActivityLog, type ActivityLogInsert } from '@/lib/store';

const today = () => new Date().toISOString().slice(0, 10);
const labels = { walking: 'เดิน', running: 'วิ่ง', other: 'อื่น ๆ' } as const;

export default function ActivityTab() {
  const [logs, setLogs] = useState<ActivityLog[]>(() => getActivityLogs());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState(() => Number(localStorage.getItem('myhealthcare_steps_goal') || 6000));
  const [sitReminder, setSitReminder] = useState(() => localStorage.getItem('myhealthcare_sit_reminder') === '1');
  const [sitMinutes, setSitMinutes] = useState(() => Number(localStorage.getItem('myhealthcare_sit_minutes') || 60));
  const [form, setForm] = useState({ activity_date: today(), activity_type: 'walking', steps: '', distance_km: '', duration_minutes: '', note: '' });

  useEffect(() => {
    if (!sitReminder) return;
    const notify = () => {
      const hour = new Date().getHours();
      if (hour < 8 || hour >= 21) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ถึงเวลาขยับร่างกายแล้ว', { body: 'ลุกขึ้นเดินหรือยืดเส้นประมาณ 2–5 นาทีครับ' });
      }
    };
    const timer = window.setInterval(notify, Math.max(15, sitMinutes) * 60_000);
    return () => window.clearInterval(timer);
  }, [sitReminder, sitMinutes]);

  const summary = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0, 0, 0, 0);
    const recent = logs.filter((x) => new Date(`${x.activity_date}T00:00:00`) >= cutoff);
    const steps = recent.reduce((sum, x) => sum + x.steps, 0);
    return { steps, average: Math.round(steps / 7) };
  }, [logs]);

  const toggleReminder = async () => {
    if (!sitReminder && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    const next = !sitReminder; setSitReminder(next); localStorage.setItem('myhealthcare_sit_reminder', next ? '1' : '0');
  };

  const save = () => {
    const steps = Number(form.steps);
    if (!form.activity_date || !Number.isFinite(steps) || steps < 0) { setError('กรุณากรอกวันที่และจำนวนก้าวให้ถูกต้อง'); return; }
    const item: ActivityLogInsert = {
      activity_date: form.activity_date,
      activity_type: form.activity_type as ActivityLogInsert['activity_type'],
      steps,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      note: form.note.trim() || null,
    };
    addActivityLog(item); setLogs(getActivityLogs()); setOpen(false); setError('');
    setForm({ activity_date: today(), activity_type: 'walking', steps: '', distance_km: '', duration_minutes: '', note: '' });
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-800">กิจกรรมเดิน–วิ่ง</h2><p className="text-xs text-slate-400">บันทึกก้าว ระยะทาง และเวลา</p></div>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4"/>บันทึก</button>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">ก้าวรวม 7 วัน</p><p className="mt-1 text-2xl font-bold text-brand-600">{summary.steps.toLocaleString()}</p></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">เฉลี่ยต่อวัน</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.average.toLocaleString()}</p></div>
      <div className="col-span-2 rounded-2xl bg-white p-4 shadow-sm sm:col-span-1"><label className="text-xs text-slate-400">เป้าหมายต่อวัน</label><div className="mt-1 flex items-center gap-2"><input type="number" min="0" value={goal} onChange={(e) => { const n=Number(e.target.value); setGoal(n); localStorage.setItem('myhealthcare_steps_goal', String(n)); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-semibold"/><span className="text-xs text-slate-400">ก้าว</span></div></div>
    </div>

    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-amber-600"/><div><p className="font-semibold text-slate-800">เตือนเมื่อนั่งนาน</p><p className="text-xs text-slate-500">แจ้งช่วง 08:00–21:00 น. ขณะเปิดแอป</p></div></div><button onClick={toggleReminder} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sitReminder ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}>{sitReminder ? 'เปิดอยู่' : 'ปิดอยู่'}</button></div>
      {sitReminder && <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">แจ้งทุก<select value={sitMinutes} onChange={(e) => { const n=Number(e.target.value); setSitMinutes(n); localStorage.setItem('myhealthcare_sit_minutes', String(n)); }} className="rounded-lg border border-amber-200 bg-white px-2 py-1.5"><option value="30">30 นาที</option><option value="45">45 นาที</option><option value="60">60 นาที</option><option value="90">90 นาที</option><option value="120">120 นาที</option></select></label>}
    </div>

    {logs.length === 0 ? <div className="py-14 text-center"><Footprints className="mx-auto mb-3 h-12 w-12 text-slate-300"/><p className="text-slate-400">ยังไม่มีบันทึกกิจกรรม</p></div> : <div className="space-y-2.5">{logs.map((log) => <div key={log.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><Footprints className="h-5 w-5 text-emerald-600"/></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{labels[log.activity_type]} · {log.steps.toLocaleString()} ก้าว</p><p className="text-xs text-slate-500">{new Date(`${log.activity_date}T00:00:00`).toLocaleDateString('th-TH')}{log.distance_km !== null ? ` · ${log.distance_km} กม.` : ''}{log.duration_minutes !== null ? ` · ${log.duration_minutes} นาที` : ''}</p>{log.note && <p className="truncate text-xs text-slate-400">{log.note}</p>}</div><button onClick={() => { deleteActivityLog(log.id); setLogs(getActivityLogs()); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4"/></button></div>)}</div>}

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">บันทึกกิจกรรม</h3><button onClick={() => setOpen(false)}><X className="text-slate-400"/></button></div><div className="grid grid-cols-2 gap-3">
      <label className="col-span-2 text-sm">วันที่<input type="date" value={form.activity_date} onChange={(e)=>setForm({...form,activity_date:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>
      <label className="col-span-2 text-sm">ประเภท<select value={form.activity_type} onChange={(e)=>setForm({...form,activity_type:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="walking">เดิน</option><option value="running">วิ่ง</option><option value="other">อื่น ๆ</option></select></label>
      <label className="col-span-2 text-sm">จำนวนก้าว<input inputMode="numeric" type="number" min="0" value={form.steps} onChange={(e)=>setForm({...form,steps:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="เช่น 6000"/></label>
      <label className="text-sm">ระยะทาง (กม.)<input inputMode="decimal" type="number" min="0" step="0.01" value={form.distance_km} onChange={(e)=>setForm({...form,distance_km:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>
      <label className="text-sm">เวลา (นาที)<input inputMode="numeric" type="number" min="0" value={form.duration_minutes} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>
      <label className="col-span-2 text-sm">หมายเหตุ<textarea value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" rows={2}/></label></div>{error && <p className="mt-3 text-sm text-red-500">{error}</p>}<button onClick={save} className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white">บันทึกกิจกรรม</button></div></div>}
  </div>;
}
