import { useState } from 'react';
import { AlertCircle, ArrowRight, Heart, LockKeyhole, Mail, User } from 'lucide-react';

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
};

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!email.trim() || password.length < 6 || (mode === 'register' && !name.trim())) { setError('กรุณากรอกข้อมูลให้ครบ และใช้รหัสผ่านอย่างน้อย 6 ตัว'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email.trim(), password);
      else {
        const result = await onRegister(name.trim(), email.trim(), password);
        if (result.needsConfirmation) setMessage('สมัครสำเร็จ กรุณาเปิดอีเมลและกดยืนยันก่อนเข้าสู่ระบบ');
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้';
      setError(text.includes('Invalid login') ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : text);
    } finally { setBusy(false); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 px-4"><div className="w-full max-w-sm">
    <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 shadow-lg"><Heart className="h-8 w-8 text-white" fill="white"/></div><h1 className="text-2xl font-bold text-slate-800">MyHealthCare</h1><p className="mt-1 text-sm text-slate-500">ข้อมูลสุขภาพออนไลน์ของครอบครัว</p></div>
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl"><div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={()=>setMode('login')} className={`rounded-lg py-2 text-sm font-semibold ${mode==='login'?'bg-white text-brand-700 shadow-sm':'text-slate-500'}`}>เข้าสู่ระบบ</button><button type="button" onClick={()=>setMode('register')} className={`rounded-lg py-2 text-sm font-semibold ${mode==='register'?'bg-white text-brand-700 shadow-sm':'text-slate-500'}`}>สมัครใช้งาน</button></div>
    <form onSubmit={submit} className="space-y-3">
      {mode==='register' && <Field icon={User} type="text" value={name} onChange={setName} placeholder="ชื่อ-นามสกุล"/>}
      <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="อีเมล"/>
      <Field icon={LockKeyhole} type="password" value={password} onChange={setPassword} placeholder="รหัสผ่านอย่างน้อย 6 ตัว"/>
      {error && <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"><AlertCircle className="h-4 w-4"/>{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy?'กำลังดำเนินการ…':mode==='login'?'เข้าสู่ระบบ':'สร้างบัญชี'}<ArrowRight className="h-4 w-4"/></button>
    </form><p className="mt-4 text-center text-xs text-slate-400">ข้อมูลจะจัดเก็บออนไลน์และแยกตามบัญชี</p></div>
  </div></div>;
}

function Field({ icon: Icon, type, value, onChange, placeholder }: { icon: typeof User; type: string; value: string; onChange: (v:string)=>void; placeholder:string }) {
  return <div className="relative"><Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} autoComplete={type==='password'?'current-password':type==='email'?'email':'name'} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"/></div>;
}
