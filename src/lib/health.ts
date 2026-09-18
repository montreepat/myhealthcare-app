export type Level = 'normal' | 'warning' | 'danger' | 'unknown';

export const LEVEL_STYLES: Record<Level, { bg: string; text: string; ring: string; dot: string; label: string }> = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'border-emerald-200', dot: 'bg-emerald-500', label: 'ปกติ' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'border-amber-200', dot: 'bg-amber-500', label: 'เฝ้าระวัง' },
  danger: { bg: 'bg-red-50', text: 'text-red-600', ring: 'border-red-200', dot: 'bg-red-500', label: 'เกินเกณฑ์' },
  unknown: { bg: 'bg-slate-50', text: 'text-slate-500', ring: 'border-slate-200', dot: 'bg-slate-300', label: 'ไม่มีข้อมูล' },
};

/* ---------- BMI ---------- */

export function calcBmi(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null;
  const m = height / 100;
  if (m <= 0) return null;
  return weight / (m * m);
}

export type BmiCategory = {
  level: Level;
  label: string;
  color: string; // tailwind bg color for the marker/status
  advice: string;
};

export function getBmiCategory(bmi: number | null): BmiCategory {
  if (bmi === null || !isFinite(bmi)) {
    return { level: 'unknown', label: 'ไม่มีข้อมูล', color: 'bg-slate-300', advice: 'กรอกน้ำหนักและส่วนสูงเพื่อคำนวณค่า BMI' };
  }
  if (bmi < 18.5) {
    return { level: 'warning', label: 'ผอม', color: 'bg-sky-500', advice: 'น้ำหนักน้อยกว่าเกณฑ์ ควรรับประทานอาหารให้ครบ 5 หมู่และเพิ่มพลังงานอย่างเหมาะสม' };
  }
  if (bmi < 25) {
    return { level: 'normal', label: 'ปกติ', color: 'bg-emerald-500', advice: 'น้ำหนักอยู่ในเกณฑ์ที่เหมาะสม รักษาพฤติกรรมการกินและการออกกำลังกายต่อไป' };
  }
  if (bmi < 30) {
    return { level: 'warning', label: 'น้ำหนักเกิน', color: 'bg-amber-500', advice: 'น้ำหนักเกินเกณฑ์ ควรควบคุมอาหารหวาน-มัน และออกกำลังกายสม่ำเสมอ' };
  }
  return { level: 'danger', label: 'โรคอ้วน', color: 'bg-red-500', advice: 'อยู่ในเกณฑ์โรคอ้วน มีความเสี่ยงต่อโรคเรื้อรัง ควรปรึกษาแพทย์เพื่อวางแผนลดน้ำหนัก' };
}

// Map a BMI value to a 0-100 percentage across a 15-40 visual scale.
export function bmiToPercent(bmi: number | null): number {
  if (bmi === null || !isFinite(bmi)) return 0;
  const pct = ((bmi - 15) / (40 - 15)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/* ---------- Blood pressure logging ---------- */

export type BpLevel = 'normal' | 'elevated' | 'stage1' | 'stage2';

export type BpAssessment = {
  level: BpLevel;
  label: string;
  bar: string; // tailwind bg color for the status bar / dot
  bg: string;
  text: string;
  ring: string;
  advice: string;
};

// Categorises a blood-pressure reading using the ACC/AHA thresholds.
// Order matters: the highest-severity band that matches wins.
export function assessBloodPressure(sys: number, dia: number): BpAssessment {
  if (sys >= 140 || dia >= 90) {
    return {
      level: 'stage2',
      label: 'ความดันสูงระดับ 2',
      bar: 'bg-red-500',
      bg: 'bg-red-50',
      text: 'text-red-600',
      ring: 'border-red-200',
      advice: 'ความดันโลหิตสูงระดับ 2 ควรนั่งพักแล้ววัดซ้ำ หากยังสูงควรรีบปรึกษาแพทย์',
    };
  }
  if (sys >= 130 || dia >= 80) {
    return {
      level: 'stage1',
      label: 'ความดันสูงระดับ 1',
      bar: 'bg-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      ring: 'border-orange-200',
      advice: 'ความดันสูงระดับ 1 ควรลดเค็ม ออกกำลังกาย และติดตามค่าอย่างสม่ำเสมอ',
    };
  }
  if (sys >= 120) {
    return {
      level: 'elevated',
      label: 'ความดันเริ่มสูง',
      bar: 'bg-amber-400',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'border-amber-200',
      advice: 'ความดันเริ่มสูง ควรปรับพฤติกรรมการกินและพักผ่อนให้เพียงพอ',
    };
  }
  return {
    level: 'normal',
    label: 'ปกติ',
    bar: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    ring: 'border-emerald-200',
    advice: 'ความดันโลหิตอยู่ในเกณฑ์ปกติ รักษาพฤติกรรมสุขภาพที่ดีต่อไป',
  };
}

/* ---------- Lab metrics ---------- */

export type MetricResult = {
  key: string;
  label: string;
  value: string;
  unit: string;
  level: Level;
  advice: string;
};

export function evalBloodPressure(sys: number | null, dia: number | null): MetricResult | null {
  if (sys === null && dia === null) return null;
  let level: Level = 'unknown';
  let advice = '';
  if (sys !== null && dia !== null) {
    if (sys < 120 && dia < 80) {
      level = 'normal';
      advice = 'ความดันโลหิตอยู่ในเกณฑ์ปกติ';
    } else if (sys < 140 && dia < 90) {
      level = 'warning';
      advice = 'ความดันเริ่มสูง ควรลดเค็ม พักผ่อนให้เพียงพอ และวัดซ้ำเป็นระยะ';
    } else {
      level = 'danger';
      advice = 'ความดันโลหิตสูงเกินเกณฑ์ ควรพบแพทย์เพื่อประเมินและติดตามอย่างใกล้ชิด';
    }
  }
  return {
    key: 'bp',
    label: 'ความดันโลหิต',
    value: sys !== null && dia !== null ? `${sys}/${dia}` : '-',
    unit: 'mmHg',
    level,
    advice,
  };
}

export function evalHba1c(val: number | null): MetricResult | null {
  if (val === null) return null;
  let level: Level;
  let advice: string;
  if (val < 5.7) {
    level = 'normal';
    advice = 'ระดับน้ำตาลสะสมปกติ ควบคุมอาหารได้ดี';
  } else if (val < 6.5) {
    level = 'warning';
    advice = 'ภาวะก่อนเบาหวาน ควรลดของหวานและแป้ง ออกกำลังกายสม่ำเสมอ';
  } else {
    level = 'danger';
    advice = 'อยู่ในเกณฑ์เบาหวาน ควรพบแพทย์เพื่อวางแผนการรักษาและควบคุมระดับน้ำตาล';
  }
  return { key: 'hba1c', label: 'น้ำตาลสะสม (HbA1c)', value: String(val), unit: '%', level, advice };
}

export function evalLdl(val: number | null): MetricResult | null {
  if (val === null) return null;
  let level: Level;
  let advice: string;
  if (val < 130) {
    level = 'normal';
    advice = 'ไขมันเลว (LDL) อยู่ในเกณฑ์ดี';
  } else if (val < 160) {
    level = 'warning';
    advice = 'LDL เริ่มสูง ควรลดอาหารมันและไขมันอิ่มตัว';
  } else {
    level = 'danger';
    advice = 'LDL สูงเกินเกณฑ์ เสี่ยงต่อโรคหลอดเลือด ควรปรึกษาแพทย์';
  }
  return { key: 'ldl', label: 'ไขมันเลว (LDL)', value: String(val), unit: 'mg/dL', level, advice };
}

export function evalHdl(val: number | null): MetricResult | null {
  if (val === null) return null;
  let level: Level;
  let advice: string;
  if (val >= 60) {
    level = 'normal';
    advice = 'ไขมันดี (HDL) อยู่ในเกณฑ์ดีเยี่ยม ช่วยป้องกันโรคหัวใจ';
  } else if (val >= 40) {
    level = 'normal';
    advice = 'ไขมันดี (HDL) อยู่ในเกณฑ์ที่ยอมรับได้';
  } else {
    level = 'warning';
    advice = 'HDL ต่ำกว่าเกณฑ์ ควรออกกำลังกายแบบแอโรบิกเพื่อเพิ่มไขมันดี';
  }
  return { key: 'hdl', label: 'ไขมันดี (HDL)', value: String(val), unit: 'mg/dL', level, advice };
}

export function evalLab(data: {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  hba1c: number | null;
  ldl: number | null;
  hdl: number | null;
}): MetricResult[] {
  return [
    evalBloodPressure(data.bp_systolic, data.bp_diastolic),
    evalHba1c(data.hba1c),
    evalLdl(data.ldl),
    evalHdl(data.hdl),
  ].filter((m): m is MetricResult => m !== null);
}
