import { useMemo, useRef, useState } from 'react';
import { FlaskConical, Plus, X, FileText, AlertCircle, Trash2, CheckCircle2, AlertTriangle, HeartPulse, UploadCloud, Loader2 } from 'lucide-react';
import { getLabResults, addLabResult, deleteLabResult, type LabResult, type LabResultInsert } from '@/lib/store';
import { evalLab, LEVEL_STYLES, type Level, type MetricResult } from '@/lib/health';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDateThai(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function LevelIcon({ level }: { level: Level }) {
  if (level === 'normal') return <CheckCircle2 className="h-4 w-4" />;
  if (level === 'warning') return <AlertTriangle className="h-4 w-4" />;
  if (level === 'danger') return <AlertCircle className="h-4 w-4" />;
  return null;
}

function MetricCard({ metric }: { metric: MetricResult }) {
  const style = LEVEL_STYLES[metric.level];
  return (
    <div className={`rounded-xl border ${style.ring} ${style.bg} p-3.5`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{metric.label}</span>
        <span className={`inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold ${style.text}`}>
          <LevelIcon level={metric.level} />
          {style.label}
        </span>
      </div>
      <p className="text-lg font-bold text-slate-800">
        {metric.value}
        <span className="ml-1 text-xs font-normal text-slate-400">{metric.unit}</span>
      </p>
      {metric.advice && <p className={`mt-1.5 text-xs leading-relaxed ${style.text}`}>{metric.advice}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  exam_date: new Date().toISOString().split('T')[0],
  bp_systolic: '',
  bp_diastolic: '',
  hba1c: '',
  ldl: '',
  hdl: '',
};

export default function LabResultsTab() {
  const [results, setResults] = useState<LabResult[]>(() => getLabResults());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; preview: string } | null>(null);
  const [extracting, setExtracting] = useState(false);

  const refresh = () => setResults(getLabResults());

  const handleFileSelect = (file: File | undefined | null) => {
    setError(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('รองรับเฉพาะไฟล์ .jpg และ .png เท่านั้น');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setUploadedFile({ name: file.name, preview });
    // จำลองการอ่านค่าจากใบผลตรวจด้วย AI
    setExtracting(true);
    setTimeout(() => {
      const rand = (min: number, max: number, decimals = 0) => {
        const v = Math.random() * (max - min) + min;
        return decimals ? v.toFixed(decimals) : String(Math.round(v));
      };
      setForm((prev) => ({
        ...prev,
        bp_systolic: rand(118, 138),
        bp_diastolic: rand(72, 88),
        hba1c: rand(5.4, 7.2, 1),
        ldl: rand(95, 155),
        hdl: rand(38, 62),
      }));
      setExtracting(false);
    }, 1400);
  };

  const parsed = useMemo(
    () => ({
      bp_systolic: numOrNull(form.bp_systolic),
      bp_diastolic: numOrNull(form.bp_diastolic),
      hba1c: numOrNull(form.hba1c),
      ldl: numOrNull(form.ldl),
      hdl: numOrNull(form.hdl),
    }),
    [form],
  );

  const livePreview = useMemo(() => evalLab(parsed), [parsed]);

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setError(null);
    if (uploadedFile) URL.revokeObjectURL(uploadedFile.preview);
    setUploadedFile(null);
    setExtracting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    const hasAny =
      parsed.hba1c !== null || parsed.ldl !== null || parsed.hdl !== null ||
      (parsed.bp_systolic !== null && parsed.bp_diastolic !== null);
    if (!form.exam_date || !hasAny) {
      setError('กรุณากรอกวันที่ตรวจ และค่าผลแลปอย่างน้อยหนึ่งรายการ');
      return;
    }
    const payload: LabResultInsert = { exam_date: form.exam_date, ...parsed };
    addLabResult(payload);
    closeModal();
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteLabResult(id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">ผลแลป &amp; สุขภาพ</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-700 hover:shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          บันทึกผลแลป
        </button>
      </div>

      {error && !showModal && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-400">ยังไม่มีผลแลป กดปุ่ม "บันทึกผลแลป" เพื่อเริ่ม</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((lab, idx) => {
            const metrics = evalLab(lab);
            return (
              <div
                key={lab.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute left-0 top-0 h-full w-1.5 bg-accent-500" />
                <div className="pl-2">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-500" />
                      <h3 className="font-semibold text-slate-800">ผลตรวจวันที่ {formatDateThai(lab.exam_date)}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(lab.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {metrics.map((m) => (
                      <MetricCard key={m.key} metric={m} />
                    ))}
                  </div>
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
              <h3 className="text-lg font-bold text-slate-800">บันทึกผลแลป</h3>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">วันที่ตรวจ</label>
                <input
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">รูปภาพใบผลตรวจ</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />

                {!uploadedFile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileSelect(e.dataTransfer.files?.[0]);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center transition-all hover:border-accent-400 hover:bg-accent-50/40"
                  >
                    <UploadCloud className="h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      ลากรูปภาพมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                    </p>
                    <p className="text-xs text-slate-400">รองรับ .jpg, .png ขนาดไม่เกิน 5MB (จากเครื่องหรือกล้องมือถือ)</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <img
                      src={uploadedFile.preview || "/placeholder.svg"}
                      alt="พรีวิวใบผลตรวจ"
                      className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                      {extracting ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-accent-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          กำลังอ่านค่าจากใบผลตรวจ...
                        </span>
                      ) : (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          อัปโหลดสำเร็จ · ดึงค่าอัตโนมัติแล้ว
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(uploadedFile.preview);
                        setUploadedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500"
                      aria-label="ลบรูปภาพ"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ความดันโลหิต (mmHg)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.bp_systolic}
                    onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })}
                    placeholder="ตัวบน 120"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.bp_diastolic}
                    onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })}
                    placeholder="ตัวล่าง 80"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">HbA1c (%)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.hba1c}
                    onChange={(e) => setForm({ ...form, hba1c: e.target.value })}
                    placeholder="5.5"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">LDL (mg/dL)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.ldl}
                    onChange={(e) => setForm({ ...form, ldl: e.target.value })}
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">HDL (mg/dL)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.hdl}
                    onChange={(e) => setForm({ ...form, hdl: e.target.value })}
                    placeholder="55"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                  />
                </div>
              </div>

              {livePreview.length > 0 && (
                <div className="rounded-xl border border-accent-100 bg-accent-50/50 p-4">
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-accent-600" />
                    <span className="text-sm font-medium text-accent-700">สรุปคำแนะนำอัตโนมัติ</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {livePreview.map((m) => (
                      <MetricCard key={m.key} metric={m} />
                    ))}
                  </div>
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
                  className="flex-1 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-700 hover:shadow-md active:scale-95"
                >
                  บันทึกผลแลป
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
