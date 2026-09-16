import { useEffect, useState, useCallback, useRef } from 'react';
import { FlaskConical, Plus, X, Upload, FileText, AlertCircle, Trash2, CheckCircle2, AlertTriangle, ScanLine } from 'lucide-react';
import { supabase, type LabResult, type LabResultInsert } from '@/lib/supabase';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatDateThai(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

type LabStatus = 'normal' | 'warning' | 'unknown';

function getFbsStatus(val: number | null): LabStatus {
  if (val === null) return 'unknown';
  if (val < 100) return 'normal';
  return 'warning';
}

function getCholesterolStatus(val: number | null): LabStatus {
  if (val === null) return 'unknown';
  if (val < 200) return 'normal';
  return 'warning';
}

function getBpStatus(sys: number | null, dia: number | null): LabStatus {
  if (sys === null || dia === null) return 'unknown';
  if (sys < 130 && dia < 85) return 'normal';
  return 'warning';
}

function StatusBadge({ status }: { status: LabStatus }) {
  if (status === 'normal') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        ปกติ
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
        <AlertTriangle className="h-3 w-3" />
        ผิดปกติ
      </span>
    );
  }
  return null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.pdf';

export default function LabResultsTab() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<LabResultInsert | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('lab_results')
      .select('*')
      .order('exam_date', { ascending: false });
    if (err) {
      setError('ไม่สามารถดึงผลแลปได้');
    } else {
      setResults(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const mockOcrParse = (fileName: string): LabResultInsert => {
    const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
    const today = new Date();
    const offset = Math.floor(Math.random() * 30);
    today.setDate(today.getDate() - offset);
    const dateStr = today.toISOString().split('T')[0];

    return {
      exam_date: dateStr,
      fbs: rand(70, 160),
      cholesterol: rand(120, 280),
      bp_systolic: Math.floor(Math.random() * 60 + 100),
      bp_diastolic: Math.floor(Math.random() * 30 + 60),
      file_name: fileName,
      file_type: fileName.split('.').pop()?.toLowerCase() || '',
    };
  };

  const handleFileSelect = (file: File) => {
    const isValidType = ACCEPTED_TYPES.includes(file.type) || /\.(jpg|jpeg|png|pdf)$/i.test(file.name);
    if (!isValidType) {
      setError('รองรับเฉพาะไฟล์ JPG, PNG และ PDF เท่านั้น');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setParsedData(mockOcrParse(file.name));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSave = async () => {
    if (!parsedData) return;
    setUploading(true);
    setError(null);
    const { error: err } = await supabase.from('lab_results').insert(parsedData);
    setUploading(false);
    if (err) {
      setError('บันทึกผลแลปไม่สำเร็จ กรุณาลองอีกครั้ง');
      return;
    }
    setShowModal(false);
    setSelectedFile(null);
    setParsedData(null);
    fetchResults();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('lab_results').delete().eq('id', id);
    if (!err) {
      setResults((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedFile(null);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">ข้อมูลผลแลป & สุขภาพ</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-700 hover:shadow-md active:scale-95"
        >
          <ScanLine className="h-4 w-4" />
          สแกนผลแลปใหม่
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-200 border-t-accent-600" />
        </div>
      )}

      {error && !showModal && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-400">ยังไม่มีผลแลป กดปุ่ม "สแกนผลแลปใหม่" เพื่อเริ่ม</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((lab, idx) => (
            <div
              key={lab.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute left-0 top-0 h-full w-1.5 bg-accent-500" />
              <div className="pl-2">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-500" />
                      <h3 className="font-semibold text-slate-800">ผลตรวจวันที่ {formatDateThai(lab.exam_date)}</h3>
                    </div>
                    {lab.file_name && (
                      <p className="mt-0.5 text-xs text-slate-400">{lab.file_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(lab.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {lab.fbs !== null && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">น้ำตาล (FBS)</span>
                        <StatusBadge status={getFbsStatus(lab.fbs)} />
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {Number(lab.fbs).toFixed(0)}
                        <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                      </p>
                    </div>
                  )}
                  {lab.cholesterol !== null && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">คอเลสเตอรอล</span>
                        <StatusBadge status={getCholesterolStatus(lab.cholesterol)} />
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {Number(lab.cholesterol).toFixed(0)}
                        <span className="ml-1 text-xs font-normal text-slate-400">mg/dL</span>
                      </p>
                    </div>
                  )}
                  {lab.bp_systolic !== null && lab.bp_diastolic !== null && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">ความดันโลหิต</span>
                        <StatusBadge status={getBpStatus(lab.bp_systolic, lab.bp_diastolic)} />
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {lab.bp_systolic}/{lab.bp_diastolic}
                        <span className="ml-1 text-xs font-normal text-slate-400">mmHg</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-slide-up sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">สแกนผลแลปใหม่</h3>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedFile && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver ? 'border-accent-400 bg-accent-50' : 'border-slate-200 hover:border-accent-300 hover:bg-slate-50'
                }`}
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">ลากไฟล์มาวางหรือคลิกเพื่อเลือก</p>
                <p className="mt-1 text-xs text-slate-400">รองรับ JPG, PNG, PDF</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXT}
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}

            {selectedFile && parsedData && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-100">
                    <FileText className="h-5 w-5 text-accent-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => { setSelectedFile(null); setParsedData(null); }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-xl border border-accent-100 bg-accent-50/50 p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <ScanLine className="h-4 w-4 text-accent-600" />
                    <span className="text-sm font-medium text-accent-700">ผลการสแกน (OCR)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-500">วันที่ตรวจ</span>
                      <p className="text-sm font-semibold text-slate-800">{formatDateThai(parsedData.exam_date)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">น้ำตาล (FBS)</span>
                      <p className="text-sm font-semibold text-slate-800">{parsedData.fbs} mg/dL</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">คอเลสเตอรอล</span>
                      <p className="text-sm font-semibold text-slate-800">{parsedData.cholesterol} mg/dL</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">ความดันโลหิต</span>
                      <p className="text-sm font-semibold text-slate-800">{parsedData.bp_systolic}/{parsedData.bp_diastolic} mmHg</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedFile(null); setParsedData(null); }}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
                  >
                    เลือกไฟล์ใหม่
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="flex-1 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-700 hover:shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? 'กำลังบันทึก...' : 'บันทึกผลแลป'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
