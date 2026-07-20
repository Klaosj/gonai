// Intent chips 4 ตัว — copy ตาม spec S1 เป๊ะ
import { INTENT_LABELS, type Intent } from "@/lib/types";

const INTENT_EMOJI: Record<Intent, string> = { work: "💻", date: "💐", family: "👨‍👩‍👧", photo: "📷" };

export default function IntentChips({
  value,
  onChange,
}: {
  value: Intent | null;
  onChange: (i: Intent) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(INTENT_LABELS) as Intent[]).map((i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`rounded-2xl border-2 px-4 py-4 text-center text-base font-medium transition ${
            value === i
              ? "border-gn-orange bg-white text-gn-orange-dark shadow-sm"
              : "border-transparent bg-white/70 hover:border-gn-orange/40"
          }`}
        >
          <span className="mr-1.5">{INTENT_EMOJI[i]}</span>
          {INTENT_LABELS[i]}
        </button>
      ))}
    </div>
  );
}
