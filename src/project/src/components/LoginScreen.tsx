import { useState } from 'react';
import { Heart, User, ArrowRight, AlertCircle } from 'lucide-react';

type Props = {
  onLogin: (name: string) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณากรอกชื่อของคุณ');
      return;
    }
    onLogin(name.trim());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 shadow-lg shadow-emerald-200 animate-scale-in">
            <Heart className="h-8 w-8 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">MyHealthCare</h1>
          <p className="mt-1 text-sm text-slate-500">แอปดูแลสุขภาพของคุณ</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อของคุณ</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="กรอกชื่อเพื่อเริ่มใช้งาน"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
            >
              เข้าสู่ระบบ
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            ข้อมูลของคุณจะถูกจดจำบนอุปกรณ์นี้ ไม่ต้องกรอกใหม่ทุกครั้ง
          </p>
        </div>
      </div>
    </div>
  );
}
