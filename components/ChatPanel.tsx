"use client";
// Chat-to-plan (คอลัมน์ซ้ายของ /app ส่วนแชท) — คุยแล้วตั้ง intent/origin/budget/filters จริง
// แยกออกจาก app/app/planner-client.tsx (T1.7 — ย้าย ไม่ใช่เขียนใหม่) เพื่อแก้บั๊ก P1:
// เดิม chat state (chatInput ฯลฯ) อยู่ใน PlannerClient เอง → พิมพ์ 1 ตัวอักษรลาก re-render
// การ์ด Top 3 ทั้งกริดไปด้วย (เพราะทุก state อยู่ component เดียวกัน) ย้าย state มาไว้ที่นี่
// (component แยก) แล้ว → พิมพ์แชทจะ re-render แค่ ChatPanel ไม่แตะ VenueCard ฝั่ง PlannerClient เลย
import { useEffect, useRef, useState } from "react";
import { gn, track } from "@/lib/api";
import type { ChatActions, ChatResponse } from "@/lib/chat";
import type { VenueFilters } from "@/lib/filters";
import type { Intent, Route } from "@/lib/types";
import { INTENTS, round50, type VenuesResponse } from "@/lib/use-venue-search";

interface ChatMeta {
  note: string | null;
  quick: boolean;
  applied: string[];
  fresh: boolean; // มี refetch — ควรพูดถึงผลลัพธ์ใหม่
}

// คำตอบใน chat ประกอบจากข้อมูลจริงเท่านั้น — AI มีสิทธิ์แค่ตั้งค่า ไม่มีสิทธิ์เขียนตัวเลขเอง (หลัก audit เดิม)
function buildChatReply(p: ChatMeta, d: { cards: unknown[]; total: number; routes: { cheapest: Route } } | null): string {
  const parts: string[] = [];
  if (p.applied.length > 0) parts.push(`Set: ${p.applied.join(" · ")}.`);
  if (p.fresh && d) {
    const fare = d.routes.cheapest.legs.reduce((s, l) => s + l.price_min, 0);
    parts.push(`Top ${d.cards.length} of ${d.total} spots refreshed — cheapest route there ${fare}฿. Pick a card →`);
  }
  if (p.note) parts.push(p.note);
  if (parts.length === 0) {
    parts.push(
      'I can set your vibe (work / date / family / photo), start zone, budget and the 5 filters — try "date from Lat Phrao, 500฿, somewhere quiet".',
    );
  }
  return parts.join(" ");
}

export function ChatPanel({
  intent,
  origin,
  budget,
  filters,
  data,
  loadError,
  onActions,
  registerDataListener,
  highlightVenue,
  initialQuery,
}: {
  intent: Intent;
  origin: string;
  budget: number;
  filters: VenueFilters;
  data: VenuesResponse | null;
  loadError: boolean;
  onActions: (a: ChatActions) => { applied: string[]; refetch: boolean }; // applyChatActions เดิม — PlannerClient เป็นคน apply
  registerDataListener: (cb: (d: VenuesResponse) => void) => void; // ต่อกับ onLoaded ของ useVenueSearch
  highlightVenue: (id: string) => void;
  initialQuery?: string | null; // /app?q= (auto-send ครั้งเดียว)
}) {
  const [chatMsgs, setChatMsgs] = useState<
    { role: "user" | "ai"; text: string; quick?: boolean; venues?: { id: string; name: string }[] }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const pendingChat = useRef<ChatMeta | null>(null); // ตอบหลัง refetch เสร็จ — ตัวเลข = data ล่าสุดจริง
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // T2.8 (การตัดสินใจ Klao ข้อ 2): มือถือ < lg ยุบแชทเป็นแถบไว้ก่อน กดเองถึงขยาย
  // ≥ lg ไม่ใช้ state นี้เลย — CSS (lg:flex) บังคับเนื้อแชทให้เต็มเสมอ ไม่มีปุ่มยุบ
  const [expanded, setExpanded] = useState(false);

  // มาจาก /app?q=... (AskBar) → auto-send เกิดขึ้นจริง ผู้ใช้ต้องเห็นคำตอบ เลยเปิดแชทให้เองทันที
  useEffect(() => {
    if (initialQuery) setExpanded(true);
  }, [initialQuery]);

  // chat เลื่อนตามข้อความล่าสุดเสมอ
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMsgs, chatSending]);

  // ฟังผลโหลดสำเร็จจาก useVenueSearch — แทน pendingChat resolution เดิมที่เคยอยู่ inline ใน load()
  useEffect(() => {
    registerDataListener((d) => {
      if (pendingChat.current) {
        const p = pendingChat.current;
        pendingChat.current = null;
        setChatMsgs((m) => [
          ...m,
          {
            role: "ai",
            text: buildChatReply(p, d),
            quick: p.quick,
            venues: d.cards.slice(0, 3).map((v) => ({ id: v.id, name: v.name_th })),
          },
        ]);
        setChatSending(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch ที่ chat รอตอบพัง (network error) — เดิมอยู่ใน catch ของ load() เดียวกับข้างบน
  useEffect(() => {
    if (loadError && pendingChat.current) {
      pendingChat.current = null;
      setChatMsgs((m) => [...m, { role: "ai", text: "Set your conditions, but refreshing results failed — check connection." }]);
      setChatSending(false);
    }
  }, [loadError]);

  // Chat → action จริง: apply เข้า state เดิมของ planner แล้วรอ refetch ก่อนตอบ
  const sendText = async (msg: string) => {
    if (!msg || chatSending) return;
    setChatSending(true);
    setChatMsgs((m) => [...m, { role: "user", text: msg }]);
    try {
      const r = await gn<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg, current: { intent, origin, budget, filters } }),
      });
      const { applied, refetch } = onActions(r.actions);
      track("chat_apply", { source: r.source, applied: applied.length });
      const meta: ChatMeta = { note: r.note, quick: r.source === "quick", applied, fresh: refetch };
      if (refetch) {
        pendingChat.current = meta; // load() ตอบให้เมื่อ data ใหม่มาถึง
      } else {
        setChatMsgs((m) => [...m, { role: "ai", text: buildChatReply(meta, data), quick: meta.quick }]);
        setChatSending(false);
      }
    } catch {
      setChatMsgs((m) => [...m, { role: "ai", text: "Something went wrong sending that — try again." }]);
      setChatSending(false);
    }
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    void sendText(msg);
  };

  // ?q= จาก landing ask bar — ส่งเข้า chat ทันทีที่ data พร้อม (ครั้งเดียว)
  const qConsumed = useRef(false);
  useEffect(() => {
    if (!initialQuery || qConsumed.current || !data) return;
    qConsumed.current = true;
    void sendText(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // follow-up chips — คำนวณสดจาก state ปัจจุบันตอน render (ไม่ค้างค่าเก่า) · กดแล้วยิง action จริงทันที
  const buildFollowups = (): { label: string; actions: ChatActions }[] => {
    const out: { label: string; actions: ChatActions }[] = [];
    if (budget > 300) {
      const cheaper = round50(budget * 0.75);
      out.push({ label: `💸 Cheaper (~${cheaper}฿)`, actions: { budget: cheaper } });
    }
    if (data?.weather?.rainExpected && !filters.indoor) {
      out.push({ label: "☔ Indoor only", actions: { filters: { indoor: true } } });
    }
    if (!filters.quiet && intent === "work") {
      out.push({ label: "🎧 Quieter please", actions: { filters: { quiet: true } } });
    }
    if (!filters.near) {
      out.push({ label: "⏱ Walkable only", actions: { filters: { near: true } } });
    }
    const other = INTENTS.find((i) => i.key !== intent);
    if (other) out.push({ label: `${other.label} instead`, actions: { intent: other.key } });
    return out.slice(0, 4);
  };

  const sendFollowup = (f: { label: string; actions: ChatActions }) => {
    if (chatSending) return;
    setChatMsgs((m) => [...m, { role: "user", text: f.label }]);
    const { applied, refetch } = onActions(f.actions);
    track("chat_followup", { label: f.label });
    const meta: ChatMeta = { note: null, quick: false, applied, fresh: refetch };
    if (refetch) {
      setChatSending(true);
      pendingChat.current = meta;
    } else {
      setChatMsgs((m) => [...m, { role: "ai", text: buildChatReply(meta, data) }]);
    }
  };

  return (
    <>
      {/* T2.8: แถบยุบ/ขยายแชท — เฉพาะมือถือ < lg (lg:hidden) · desktop ไม่มีปุ่มนี้เลย เห็นแชทเต็มเสมอ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="gn-chat-body"
        data-chat-toggle
        className="gn-press flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-card-solid/60 px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink lg:hidden"
      >
        <span>💬 Chat with GoNai — tell it what you feel like</span>
        <span aria-hidden="true" className="shrink-0 text-mut">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* เนื้อแชทจริง — มือถือ < lg โชว์ตาม expanded, ≥ lg (lg:flex) เต็มเสมอไม่สนใจ state นี้เลย */}
      <div id="gn-chat-body" className={`${expanded ? "flex" : "hidden"} flex-col gap-2.5 lg:flex`}>
        {/* chat จริง — พิมพ์อิสระไทย/อังกฤษ AI ตั้งเงื่อนไขให้ ตัวเลขทุกตัวมาจาก data
            T3.2: ครอบรายการข้อความด้วย role=log ให้ screen reader ประกาศข้อความใหม่อัตโนมัติ
            (ไม่รวม composer/follow-up chips ด้านล่าง เพราะไม่ใช่เนื้อหา log) */}
        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2.5">
          {chatMsgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="max-w-[85%] self-end rounded-2xl bg-pill px-3.5 py-2.5 text-[13.5px] leading-relaxed text-bg">
                {m.text}
              </div>
            ) : (
              <div key={i} className="max-w-[92%] rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
                {m.quick && <span className="o-mono mb-0.5 block text-[9px] text-mut">quick match · no AI key</span>}
                {m.text}
                {/* การ์ด Top 3 กดได้ — เลื่อนไปการ์ดจริง ไม่ใช่ text ลอยๆ */}
                {m.venues && m.venues.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {m.venues.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => highlightVenue(v.id)}
                        className="gn-press rounded-full border border-accent/40 bg-tint px-2.5 py-1 text-[11.5px] font-semibold text-accent"
                      >
                        📍 {v.name}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            ),
          )}
          {chatSending && (
            <div className="w-fit rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[13px] text-mut">
              <span className="gn-spinner" />
              thinking…
            </div>
          )}
        </div>
        {/* follow-up chips — โผล่หลังคำตอบล่าสุด กดแล้ว action จริงทันที ไม่ต้องพิมพ์ */}
        {!chatSending && chatMsgs.length > 0 && chatMsgs[chatMsgs.length - 1].role === "ai" && (
          <div className="flex flex-wrap gap-1.5">
            {buildFollowups().map((f) => (
              <button
                key={f.label}
                onClick={() => sendFollowup(f)}
                className="gn-press rounded-full border border-line bg-bg px-3 py-1.5 text-[11.5px] text-mut hover:border-ink hover:text-ink"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div ref={chatEndRef} />

        {/* sticky ล่างของ aside — คุยยาวแค่ไหนช่องพิมพ์ก็ไม่หาย */}
        <div className="sticky bottom-0 z-10 -mx-1 bg-card px-1 pb-0.5 pt-1">
          <div className="flex items-center gap-1.5">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder='Try "date from Lat Phrao, 500฿, quiet"'
              aria-label="Chat to set your plan"
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3.5 py-2 text-[13px] text-ink placeholder:text-mut"
            />
            <button
              onClick={sendChat}
              disabled={chatSending}
              aria-busy={chatSending}
              aria-label="Send"
              className="gn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-base text-white disabled:opacity-60"
            >
              {chatSending ? <span className="gn-spinner" style={{ margin: 0 }} /> : "↑"}
            </button>
          </div>
          <p className="o-mono-text mt-1 text-[10.5px] text-mut">AI sets the conditions — every number comes from real data</p>
        </div>
      </div>
    </>
  );
}
