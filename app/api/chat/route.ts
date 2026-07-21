import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { attachAuth, resolveUser } from "@/lib/auth";
import { parseQuick, type ChatActions, type ChatParse, type ChatResponse } from "@/lib/chat";
import { FILTER_KEYS } from "@/lib/filters";
import { ZONES } from "@/lib/fixtures";
import { rateLimit } from "@/lib/ratelimit";
import { store } from "@/lib/store";

// Chat-to-plan: Claude Haiku 4.5 ทำหน้าที่เดียว — แปลภาษาอิสระเป็น action ที่ enum ล็อคไว้
// (structured output บังคับ schema) แล้ว engine เดิมเป็นคนตอบตัวเลขจริงฝั่ง client
// ไม่มี credential (dev เครื่องอื่น / ยังไม่ตั้ง ANTHROPIC_API_KEY) → ตกลง quick parser เงียบๆ

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

async function parseWithClaude(message: string, current: ChatBody["current"]): Promise<ChatParse> {
  const client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY / ant auth profile จาก env เอง
  const resp = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: JSON.stringify({ message, current: current ?? null }) }],
  });
  const text = resp.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block");
  const parsed = JSON.parse(text.text) as {
    actions: {
      intent: ChatActions["intent"] | null;
      origin: string | null;
      budget: number | null;
      filters: Record<string, boolean | null>;
    };
    note: string | null;
  };

  // แปลง null → undefined ให้ตรง ChatActions (null = ไม่แตะ)
  const actions: ChatActions = {};
  if (parsed.actions.intent) actions.intent = parsed.actions.intent;
  if (parsed.actions.origin) actions.origin = parsed.actions.origin;
  if (typeof parsed.actions.budget === "number" && parsed.actions.budget > 0) actions.budget = parsed.actions.budget;
  const filters: ChatActions["filters"] = {};
  for (const k of FILTER_KEYS) {
    const v = parsed.actions.filters?.[k];
    if (typeof v === "boolean") filters[k] = v;
  }
  if (Object.keys(filters).length > 0) actions.filters = filters;

  return { actions, note: parsed.note };
}

export async function POST(req: NextRequest) {
  const auth = resolveUser(req);
  if (!rateLimit(`chat:${auth.id}`, 30, 5 * 60_000)) {
    return attachAuth(new NextResponse("Too many messages — wait a minute", { status: 429 }), auth);
  }

  const { message, current } = (await req.json()) as ChatBody;
  if (!message || typeof message !== "string" || message.length > 500) {
    return attachAuth(new NextResponse("message required (≤500 chars)", { status: 400 }), auth);
  }

  let result: ChatResponse;
  try {
    result = { ...(await parseWithClaude(message, current)), source: "ai" };
  } catch {
    // ไม่มี key / โมเดลล่ม / parse พัง — quick parser รับช่วง ผู้ใช้ไม่เจอ error
    result = { ...parseQuick(message), source: "quick" };
  }

  await store.ensureUser(auth.id);
  await store.addEvent(auth.id, "chat_message", {
    source: result.source,
    matched: Object.keys(result.actions),
  });

  return attachAuth(NextResponse.json(result), auth);
}
