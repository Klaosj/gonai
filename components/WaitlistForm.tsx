"use client";
// ฟอร์ม waitlist บน landing — เก็บ LINE ID / อีเมล + PDPA consent
import { useState } from "react";

export default function WaitlistForm({ source }: { source: string }) {
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact, source, pdpa_consent: consent }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^\d+: /, "") : "ลองใหม่อีกครั้ง");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-bg/50 px-6 py-4 text-sm font-semibold text-ink backdrop-blur">
        ✅ รับไว้แล้ว! เปิดโซนใหม่ / ฟีเจอร์ใหม่เมื่อไหร่ เราจะทักไปก่อนใคร
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 max-w-md">
      <div className="flex gap-2">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="LINE ID หรืออีเมล"
          className="min-w-0 flex-1 rounded-full border border-line bg-bg/50 px-5 py-3 text-sm text-ink placeholder:text-mut outline-none backdrop-blur"
          required
        />
        <button
          type="submit"
          disabled={status === "sending" || !consent}
          className="gn-press o-pill-primary o-btn-label shrink-0 px-6 py-3 text-sm disabled:opacity-50"
        >
          {status === "sending" ? "..." : "รับข่าวเปิดตัว"}
        </button>
      </div>
      <label className="mt-3 flex items-start justify-center gap-2 text-xs text-ink/80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>ยินยอมให้ติดต่อกลับเรื่อง GoNai เท่านั้น — ลบได้ทุกเมื่อ ไม่ส่งต่อให้ใคร (PDPA)</span>
      </label>
      {status === "error" && <p className="mt-2 text-xs font-semibold text-bad">{error}</p>}
    </form>
  );
}
