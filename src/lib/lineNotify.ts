// Sends a formatted blood-pressure summary to the user's LINE account via
// the existing Convex webhook. The webhook resolves the recipient by the
// member's OTP code (the same code used to bind their LINE account).

const CONVEX_WEBHOOK_URL = 'https://rightful-bullfrog-554.convex.site/line-webhook';

export type BpNotificationData = {
  otp: string;
  memberName: string;
  dateTime: string;
  period: 'morning' | 'evening';
  systolic: number;
  diastolic: number;
  pulse: number | null;
  note: string | null;
  assessmentLabel: string;
  advice: string;
};

function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
}

export function buildBpMessage(data: BpNotificationData): string {
  const lines: string[] = [];
  lines.push('🩺 บันทึกความดันโลหิตเรียบร้อย');
  lines.push('────────────────');
  lines.push(`👤 ชื่อ: ${data.memberName}`);
  lines.push(`📅 วันเวลา: ${formatThaiDateTime(data.dateTime)} (${data.period === 'morning' ? 'ช่วงเช้า' : 'ช่วงเย็น'})`);
  lines.push(`💓 ความดัน: ${data.systolic}/${data.diastolic} mmHg (${data.assessmentLabel})`);
  if (data.pulse !== null) {
    lines.push(`❤️ ชีพจร: ${data.pulse} bpm`);
  }
  if (data.note) {
    lines.push(`📝 บันทึก: ${data.note}`);
  }
  lines.push('────────────────');
  lines.push(`💡 คำแนะนำ: ${data.advice}`);
  return lines.join('\n');
}

export async function sendBpLineNotification(data: BpNotificationData): Promise<{ ok: boolean; error?: string }> {
  const message = buildBpMessage(data);
  try {
    const res = await fetch(CONVEX_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bp_notification',
        otp: data.otp,
        message,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: msg };
  }
}
