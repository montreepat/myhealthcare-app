import { useMemo, useState } from 'react';
import { Check, CircleOff, Clock3, Pill, Plus, Trash2, X } from 'lucide-react';
import {
  addMedication,
  addMedicationLog,
  deleteMedication,
  getMedicationLogs,
  getMedications,
  updateMedication,
  type MedicationInsert,
} from '@/lib/store';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: MedicationInsert = {
  name: '', strength: '', dose: '', schedule: '', meal_timing: 'after',
  start_date: today(), end_date: null, prescriber: null, hospital: null,
  purpose: null, note: null, active: true,
};

const MEALS = { before: 'ก่อนอาหาร', after: 'หลังอาหาร', with: 'พร้อมอาหาร', any: 'ไม่กำหนด' } as const;

export default function MedicationsTab() {
  const [items, setItems] = useState(() => getMedications());
  const [logs, setLogs] = useState(() => getMedicationLogs());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MedicationInsert>(EMPTY);
  const [error, setError] = useState('');

  const refresh = () => { setItems(getMedications()); setLogs(getMedicationLogs()); };
  const todayLogs = useMemo(() => logs.filter((log) => log.scheduled_at.slice(0, 10) === today()), [logs]);

  const save = () => {
    if (!form.name.trim() || !form.dose.trim() || !form.schedule.trim()) {
      setError('กรุณากรอกชื่อยา จำนวนที่รับประทาน และเวลา/ความถี่');
      return;
    }
    addMedication({ ...form, name: form.name.trim(), strength: form.strength.trim(), dose: form.dose.trim(), schedule: form.schedule.trim() });
    setForm(EMPTY); setShowForm(false); setError(''); refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ยาและการรับประทานยา</h2>
          <p className="mt-1 text-xs text-slate-500">บันทึกตามฉลากยาหรือคำสั่งแพทย์เท่านั้น</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> เพิ่มยา
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-slate-400">
          <Pill className="mx-auto mb-3 h-11 w-11 text-slate-300" />
          <p>ยังไม่มีรายการยา</p>
        </div>
      )}

      {items.map((item) => {
        const latest = todayLogs.find((log) => log.medication_id === item.id);
        return (
          <div key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600"><Pill className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold text-slate-800">{item.name} {item.strength}</h3>
                  <p className="text-sm text-slate-600">{item.dose} · {item.schedule} · {MEALS[item.meal_timing]}</p>
                  {item.purpose && <p className="mt-1 text-xs text-slate-500">สำหรับ: {item.purpose}</p>}
                </div>
              </div>
              <button onClick={() => { if (window.confirm('ลบรายการยานี้หรือไม่')) { deleteMedication(item.id); refresh(); } }} className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label="ลบยา"><Trash2 className="h-4 w-4" /></button>
            </div>

            {item.active && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => { addMedicationLog(item.id, 'taken'); refresh(); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${latest?.status === 'taken' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}><Check className="h-4 w-4" /> รับประทานแล้ว</button>
                <button onClick={() => { addMedicationLog(item.id, 'skipped'); refresh(); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${latest?.status === 'skipped' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'}`}><Clock3 className="h-4 w-4" /> ข้ามครั้งนี้</button>
                <button onClick={() => { updateMedication(item.id, { active: false }); refresh(); }} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600"><CircleOff className="h-4 w-4" /> หยุดยาแล้ว</button>
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-bold">เพิ่มรายการยา</h3><button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อยา *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="เช่น Metformin" />
              <Field label="ความแรง" value={form.strength} onChange={(v) => setForm({ ...form, strength: v })} placeholder="เช่น 500 mg" />
              <Field label="รับประทานครั้งละ *" value={form.dose} onChange={(v) => setForm({ ...form, dose: v })} placeholder="เช่น 1 เม็ด" />
              <Field label="เวลา/ความถี่ *" value={form.schedule} onChange={(v) => setForm({ ...form, schedule: v })} placeholder="เช่น เช้าและเย็น" />
              <label className="text-sm font-medium text-slate-700">ช่วงอาหาร<select value={form.meal_timing} onChange={(e) => setForm({ ...form, meal_timing: e.target.value as MedicationInsert['meal_timing'] })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5">{Object.entries(MEALS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <Field label="วันที่เริ่ม" value={form.start_date} type="date" onChange={(v) => setForm({ ...form, start_date: v })} />
              <Field label="แพทย์ผู้สั่ง" value={form.prescriber ?? ''} onChange={(v) => setForm({ ...form, prescriber: v || null })} />
              <Field label="โรงพยาบาล" value={form.hospital ?? ''} onChange={(v) => setForm({ ...form, hospital: v || null })} />
              <div className="sm:col-span-2"><Field label="ใช้สำหรับ/หมายเหตุ" value={form.purpose ?? ''} onChange={(v) => setForm({ ...form, purpose: v || null })} /></div>
            </div>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button onClick={save} className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white">บันทึกรายการยา</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="text-sm font-medium text-slate-700">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" /></label>;
}
