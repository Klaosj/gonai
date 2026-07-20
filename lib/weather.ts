// Weather intelligence — Open-Meteo (ฟรี ไม่ต้องมี API key)
// ใช้แทนคำเตือนฝน hardcode เดิม: ถ้าดึงไม่ได้ → null → UI ไม่โชว์อะไร (ห้ามเดา)
// cache 30 นาที — พยากรณ์รายชั่วโมงไม่เปลี่ยนถี่กว่านั้น

export interface RainForecast {
  maxProb: number; // ความน่าจะเป็นฝนสูงสุด (%) ช่วงที่เหลือของวัน
  peakHour: number | null; // ชั่วโมง (0-23) ที่ฝนแรงสุด — null ถ้าไม่ถึงเกณฑ์
  rainExpected: boolean; // maxProb ≥ 50
}

const BKK = "latitude=13.7563&longitude=100.5018";
const URL = `https://api.open-meteo.com/v1/forecast?${BKK}&hourly=precipitation_probability&forecast_days=1&timezone=Asia%2FBangkok`;
const TTL_MS = 30 * 60_000;

let cache: { data: RainForecast | null; at: number } | null = null;

// pure function — แยกไว้ให้ tests เรียกได้โดยไม่แตะ network
// ดูเฉพาะช่วง nowHour..22:00 ของวันนี้ (หลังเที่ยงคืนไม่มีใครวางแผนเที่ยวต่อ)
export function analyzeRain(times: string[], probs: number[], nowHour: number): RainForecast {
  let maxProb = 0;
  let peakHour: number | null = null;
  times.forEach((t, i) => {
    const h = parseInt(t.slice(11, 13), 10);
    const p = probs[i] ?? 0;
    if (h >= nowHour && h <= 22 && p > maxProb) {
      maxProb = p;
      peakHour = h;
    }
  });
  const rainExpected = maxProb >= 50;
  return { maxProb, peakHour: rainExpected ? peakHour : null, rainExpected };
}

export async function getRainForecast(): Promise<RainForecast | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const j = (await res.json()) as {
      hourly?: { time?: string[]; precipitation_probability?: number[] };
    };
    const nowHour = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).format(
        new Date(),
      ),
      10,
    );
    const data = analyzeRain(j.hourly?.time ?? [], j.hourly?.precipitation_probability ?? [], nowHour);
    cache = { data, at: Date.now() };
    return data;
  } catch {
    // cache ผล error ด้วย — กันยิงซ้ำรัวๆ ตอน API ล่ม
    cache = { data: null, at: Date.now() };
    return null;
  }
}
