import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/api-guard";
import { attachAuth, resolveUser } from "@/lib/auth";
import { ollamaAllowed, ollamaHeaders, parseQuick, type ChatActions, type ChatParse, type ChatResponse } from "@/lib/chat";
import { FILTER_KEYS } from "@/lib/filters";
import { ZONES } from "@/lib/fixtures";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

// Chat-to-plan: Claude Haiku 4.5 ทำหน้าที่เดียว — แปลภาษาอิสระเป็น action ที่ enum ล็อคไว้
// (structured output บังคับ schema) แล้ว engine เดิมเป็นคนตอบตัวเลขจริงฝั่ง client
// ไม่มี credential (dev เครื่องอื่น / ยังไม่ตั้ง ANTHROPIC_API_KEY) → ตกลง quick parser เงียบๆ

// Vercel: เผื่อเวลา function ให้ครอบ Ollama timeout 20s (default บางแผน 10s ไม่พอ)
export const maxDuration = 30;

const ORIGIN_IDS = ZONES.filter((z) => z.is_origin).map((z) => z.id);
const ORIGIN_LIST = ZONES.filter((z) => z.is_origin)
  .map((z) => `${z.id} (${z.name_th})`)
  .join(", ");

const nullable = (t: object) => ({ anyOf: [t, { type: "null" }] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["actions", "note"],
  properties: {
    actions: {
      type: "object",
      additionalProperties: false,
      required: ["intent", "origin", "budget", "filters"],
      properties: {
        intent: nullable({ type: "string", enum: ["work", "date", "family", "photo"] }),
        origin: nullable({ type: "string", enum: ORIGIN_IDS }),
        budget: nullable({ type: "integer" }),
        filters: {
          type: "object",
          additionalProperties: false,
          required: [...FILTER_KEYS],
          properties: Object.fromEntries(FILTER_KEYS.map((k) => [k, nullable({ type: "boolean" })])),
        },
      },
    },
    note: nullable({ type: "string" }),
  },
} as const;

const SYSTEM = `You translate a user's free-text message (Thai or English) into settings for GoNai, a Bangkok day-trip planner around Siam. Your ONLY job is extraction — the app computes all prices and results itself.

Fields (null = leave unchanged):
- intent: work (work/meetings out of home), date, family (day with kids/parents), photo (photo walk)
- origin: starting zone, one of: ${ORIGIN_LIST}
- budget: total budget in THB for the day (integer). Only set when the user states an amount.
- filters.near: walk ≤10 min from the hub · filters.food: real meals · filters.quiet: quiet enough for calls · filters.plugs: power plugs · filters.indoor: indoor (rain-safe). true = turn on, false = turn off, null = unchanged. If the user mentions rain, set indoor true.
- note: null in most cases. Set a short English sentence (max 15 words) ONLY to ask for a missing essential detail or flag something you could not map. Never include prices or numbers of results — the app adds real numbers itself.

The "current" object in the input shows the user's present settings — use it to interpret relative requests (e.g. "cheaper" → budget lower than current, rounded to 50).`;

interface ChatBody {
  message?: string;
  current?: { intent?: string; origin?: string; budget?: number; filters?: Record<string, boolean> };
}

// ผลดิบจากโมเดล (schema เดียวกันทั้ง Claude และ Ollama) — null = ไม่แตะ field นั้น
interface RawParsed {
  actions: {
    intent: ChatActions["intent"] | null;
    origin: string | null;
    budget: number | null;
    filters: Record<string, boolean | null>;
  };
  note: string | null;
}

// แปลง null → undefined ให้ตรง ChatActions (ใช้ร่วมทุก engine)
// validate enum ที่นี่เสมอ — โมเดล cloud ของ Ollama ไม่บังคับ schema (format ถูกเมิน)
// ค่าที่หลุด enum ต้องตกหล่นเงียบๆ ไม่ใช่ไหลเข้า state ของ planner
const INTENT_SET = new Set(["work", "date", "family", "photo"]);
function normalizeParsed(parsed: RawParsed): ChatParse {
  const actions: ChatActions = {};
  if (parsed.actions?.intent && INTENT_SET.has(parsed.actions.intent)) actions.intent = parsed.actions.intent;
  if (parsed.actions?.origin && ORIGIN_IDS.includes(parsed.actions.origin)) actions.origin = parsed.actions.origin;
  if (typeof parsed.actions?.budget === "number" && parsed.actions.budget > 0) actions.budget = Math.round(parsed.actions.budget);
  const filters: ChatActions["filters"] = {};
  for (const k of FILTER_KEYS) {
    const v = parsed.actions?.filters?.[k];
    if (typeof v === "boolean") filters[k] = v;
  }
  if (Object.keys(filters).length > 0) actions.filters = filters;
  return { actions, note: typeof parsed.note === "string" ? parsed.note : null };
}

// ดึง JSON object จากคำตอบโมเดลที่อาจห่อ prose/code fence มา (โหมด cloud ไม่มี format บังคับ)
function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no json object in reply");
  return cleaned.slice(start, end + 1);
}

async function parseWithClaude(message: string, current: ChatBody["current"]): Promise<ChatParse> {
  const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก env เอง — ไม่มี key = throw ทันที (ไปต่อ Ollama)
  const resp = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: JSON.stringify({ message, current: current ?? null }) }],
  });
  const text = resp.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block");
  return normalizeParsed(JSON.parse(text.text) as RawParsed);
}

// Ollama (LLM ในเครื่อง) — ตัวหลักบนเครื่อง dev ของ Klao: ฟรี ไม่ต้องมี key
// structured output ผ่าน `format: <json schema>` schema เดียวกับ Claude เป๊ะ
// timeout 20s เผื่อโหลดโมเดลเข้า RAM ครั้งแรก (gemma4:12b ~7.5GB) — ครั้งถัดไปเร็ว
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:12b";

// โมเดล cloud (เช่น minimax-m3:cloud) เมิน `format` — constrained decoding มีเฉพาะโมเดล local
// จึงบังคับผ่าน prompt ด้วยเสมอ แล้ว extractJson + normalizeParsed (validate enum) เป็นตาข่ายรับ
const OLLAMA_JSON_RULE = `

OUTPUT FORMAT (STRICT): reply with ONLY one JSON object, no prose, no markdown fences:
{"actions":{"intent":"work|date|family|photo"|null,"origin":"<zone id>"|null,"budget":<integer>|null,"filters":{"near":bool|null,"food":bool|null,"quiet":bool|null,"plugs":bool|null,"indoor":bool|null}},"note":"<string>"|null}`;

async function parseWithOllama(message: string, current: ChatBody["current"]): Promise<ChatParse> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: ollamaHeaders(process.env),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: SCHEMA, // โมเดล local เคารพ schema นี้ · โมเดล cloud เมินแล้วไปพึ่ง OLLAMA_JSON_RULE แทน
      options: { temperature: 0 },
      messages: [
        { role: "system", content: SYSTEM + OLLAMA_JSON_RULE },
        { role: "user", content: JSON.stringify({ message, current: current ?? null }) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  if (!data.message?.content) throw new Error("ollama empty reply");
  return normalizeParsed(JSON.parse(extractJson(data.message.content)) as RawParsed);
}

export const POST = guarded(async (req: NextRequest) => {
  const auth = resolveUser(req);
  if (!rateLimit(`chat:${auth.id}`, 30, 5 * 60_000)) {
    return attachAuth(new NextResponse("Too many messages — wait a minute", { status: 429 }), auth);
  }

  const { message, current } = (await req.json()) as ChatBody;
  if (!message || typeof message !== "string" || message.length > 500) {
    return attachAuth(new NextResponse("message required (≤500 chars)", { status: 400 }), auth);
  }

  let result: ChatResponse;
  // ลำดับ engine: Claude (มี key) → Ollama (เครื่อง dev) → quick parser — ผู้ใช้ไม่เจอ error สักชั้น
  let engine: "claude" | "ollama" | "quick" = "quick";
  try {
    result = { ...(await parseWithClaude(message, current)), source: "ai" };
    engine = "claude";
  } catch {
    if (!ollamaAllowed(process.env)) {
      // prod ที่ไม่ได้ตั้ง OLLAMA_URL — ไม่มีทางมี Ollama ให้ลอง ข้ามไป quick เลย (ไม่เปลือง fetch + log)
      result = { ...parseQuick(message), source: "quick" };
    } else {
      try {
        result = { ...(await parseWithOllama(message, current)), source: "ai" };
        engine = "ollama";
      } catch (e) {
        // Ollama ไม่รัน / โมเดลไม่มี / timeout / ตอบไม่เป็น JSON — quick parser รับช่วง
        // log สาเหตุไว้ฝั่ง server เสมอ (ผู้ใช้ไม่เห็น) — fallback เงียบสนิทเคยทำให้ debug ไม่ได้
        console.error("[chat] ollama fallback:", e instanceof Error ? e.message : e);
        result = { ...parseQuick(message), source: "quick" };
      }
    }
  }

  await store.ensureUser(auth.id);
  await store.addEvent(auth.id, "chat_message", {
    source: result.source,
    engine,
    matched: Object.keys(result.actions),
  });

  return attachAuth(NextResponse.json(result), auth);
});
