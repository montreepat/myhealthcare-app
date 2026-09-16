import { useState, useEffect } from 'react';
import { Bell, MessageCircle, CheckCircle2, Smartphone, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

const CONVEX_WEBHOOK_URL = 'https://rightful-bullfrog-554.convex.site/line-webhook';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LineTab() {
  const [otp] = useState(generateOtp);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(otp).then(() => setCopied(true));
  };

  const otpDigits = otp.split('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">แจ้งเตือน LINE</h2>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm animate-slide-up">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">การเชื่อมต่อ LINE OA</h3>
              <p className="text-sm text-emerald-50">รับการแจ้งเตือนนัดหมายผ่าน LINE</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              พร้อมใช้งาน
            </span>
            <span className="text-xs text-slate-400">Webhook URL พร้อมทำงาน</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-500">Webhook URL</p>
            <p className="break-all text-xs text-slate-600">{CONVEX_WEBHOOK_URL}</p>
          </div>

          <div className="text-center">
            <p className="mb-3 text-sm font-medium text-slate-600">รหัสเชื่อมต่อ (OTP)</p>
            <div className="flex justify-center gap-2 sm:gap-3" onClick={handleCopy}>
              {otpDigits.map((digit, idx) => (
                <div
                  key={idx}
                  className="flex h-14 w-11 items-center justify-center rounded-xl border-2 border-accent-200 bg-white text-2xl font-bold text-accent-700 shadow-sm transition-all hover:border-accent-400 hover:shadow-md sm:h-16 sm:w-14 sm:text-3xl animate-scale-in"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {digit}
                </div>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-accent-600"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  คัดลอกแล้ว
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  แตะเพื่อคัดลอกรหัส
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm animate-slide-up">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <Smartphone className="h-5 w-5 text-accent-500" />
          วิธีการเชื่อมต่อ
        </h3>
        <div className="space-y-4">
          {[
            { icon: MessageCircle, title: 'เพิ่ม LINE OA', desc: 'เปิดแอป LINE แล้วสแกน QR Code หรือค้นหา LINE OA ของ MyHealthCare เพื่อเพิ่มเป็นเพื่อน' },
            { icon: ShieldCheck, title: 'กรอกรหัส OTP', desc: 'ส่งรหัส 6 หลักด้านบนไปยัง LINE OA เพื่อยืนยันตัวตนและเชื่อมต่อบัญชี' },
            { icon: Bell, title: 'รับการแจ้งเตือนอัตโนมัติ', desc: 'ระบบจะส่งแจ้งเตือนผ่าน LINE ก่อนนัดหมาย 1 วัน และแจ้งผลแลปเมื่อมีการอัปเดต' },
          ].map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="relative flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50">
                  <step.icon className="h-4 w-4 text-accent-600" />
                </div>
                {idx < 2 && <div className="mt-1 h-full w-px bg-slate-100" />}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-sm font-medium text-slate-700">
                  <span className="mr-1.5 text-accent-500">{idx + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 animate-slide-up">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-700">การแจ้งเตือนล่วงหน้า</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-600">
            ระบบจะส่งข้อความแจ้งเตือนผ่าน LINE ก่อนถึงนัดหมาย 1 วัน เพื่อให้คุณเตรียมตัวได้ทันเวลา เช่น งดน้ำ-อาหาร หรือเตรียมเอกสาร
          </p>
        </div>
      </div>
    </div>
  );
}
