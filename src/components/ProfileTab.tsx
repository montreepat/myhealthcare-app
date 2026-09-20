import { useMemo, useState } from 'react';
import { useRef } from 'react';
import { User, Scale, Ruler, CheckCircle2, Activity, Download, Upload } from 'lucide-react';
import { createBackup, getProfile, restoreBackup, saveProfile, type StoreBackup } from '@/lib/store';
import { useProfiles } from '@/hooks/useProfiles';
import { calcBmi, getBmiCategory, bmiToPercent } from '@/lib/health';

const SEGMENTS = [
  { label: 'ผอม', color: 'bg-sky-400' },
  { label: 'ปกติ', color: 'bg-emerald-500' },
  { label: 'น้ำหนักเกิน', color: 'bg-amber-500' },
  { label: 'โรคอ้วน', color: 'bg-red-500' },
];

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

export default function ProfileTab() {
  const { updateActiveProfile } = useProfiles();
  const initial = getProfile();
  const [fullName, setFullName] = useState(initial.full_name);
  const [weight, setWeight] = useState(initial.weight !== null ? String(initial.weight) : '');
  const [height, setHeight] = useState(initial.height !== null ? String(initial.height) : '');
  const [saved, setSaved] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);

  const weightNum = numOrNull(weight);
  const heightNum = numOrNull(height);

  const bmi = useMemo(() => calcBmi(weightNum, heightNum), [weightNum, heightNum]);
  const category = useMemo(() => getBmiCategory(bmi), [bmi]);
  const percent = bmiToPercent(bmi);

  const handleSave = () => {
    const profile = { full_name: fullName.trim(), weight: weightNum, height: heightNum };
    saveProfile(profile);
    updateActiveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(createBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myhealthcare-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as StoreBackup;
      if (!window.confirm('นำเข้าข้อมูลจากไฟล์นี้และแทนที่ข้อมูลที่ชื่อซ้ำหรือไม่?')) return;
      restoreBackup(backup);
      window.alert('นำเข้าข้อมูลสำเร็จ ระบบจะโหลดหน้าใหม่');
      window.location.reload();
    } catch {
      window.alert('ไม่สามารถอ่านไฟล์สำรองนี้ได้');
    } finally {
      if (backupInput.current) backupInput.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">ข้อมูลส่วนตัว &amp; ค่า BMI</h2>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm animate-slide-up">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อ-นามสกุล</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น สมหญิง ใจดี"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">น้ำหนัก (กก.)</label>
              <div className="relative">
                <Scale className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="60"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">ส่วนสูง (ซม.)</label>
              <div className="relative">
                <Ruler className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="165"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                บันทึกแล้ว
              </>
            ) : (
              'บันทึกข้อมูลส่วนตัว'
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800">สำรองข้อมูลเครื่องนี้</h3>
        <p className="mt-1 text-sm text-slate-500">ดาวน์โหลดข้อมูลเดิมเก็บไว้ก่อนย้ายเข้าสู่ฐานข้อมูลออนไลน์</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button onClick={downloadBackup} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" /> ดาวน์โหลดไฟล์สำรอง</button>
          <button onClick={() => backupInput.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"><Upload className="h-4 w-4" /> นำเข้าข้อมูลสำรอง</button>
          <input ref={backupInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importBackup(e.target.files?.[0])} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm animate-slide-up">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold text-slate-800">ดัชนีมวลกาย (BMI)</h3>
        </div>

        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-slate-800">
              {bmi !== null ? bmi.toFixed(1) : '--'}
            </p>
            <p className="text-xs text-slate-400">kg/m²</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white ${category.color}`}
          >
            {category.label}
          </span>
        </div>

        <div className="relative mb-2">
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {SEGMENTS.map((s) => (
              <div key={s.label} className={`flex-1 ${s.color}`} />
            ))}
          </div>
          {bmi !== null && (
            <div
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-800 shadow-md transition-all"
              style={{ left: `${percent}%` }}
              aria-hidden
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] font-medium text-slate-400">
          {SEGMENTS.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>

        <div className={`mt-4 rounded-xl border ${category.color.replace('bg-', 'border-').replace('500', '200').replace('400', '200')} bg-slate-50 p-3.5`}>
          <p className="text-sm leading-relaxed text-slate-600">{category.advice}</p>
        </div>
      </div>
    </div>
  );
}
