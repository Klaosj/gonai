// csv-to-fixtures.ts — แปลง CSV (W2 field sprint output) → lib/fixtures.ts
// วิธีใช้: tsx tests/csv-to-fixtures.ts < input.csv > lib/fixtures.ts
// หรือ: tsx tests/csv-to-fixtures.ts tests/fixtures-template.csv
//
// CSV columns (ตาม spec 2.4):
//   venue_id, name_th, zone_id, category, intents (semicolon-sep), badge,
//   hit_rank, unseen_rank, transition_rank (empty = null),
//   plugs (none|some|all), wifi_mbps (empty=null), seat_hours (empty=null, 999=ไม่จำกัด),
//   noise (quiet|medium|loud), parking (true|false), food_level (drinks|snacks|meals),
//   indoor (true|false), shade (true|false),
//   price_per_head_min, price_per_head_max, open_time, close_time, walk_min_from_hub,
//   video_url (empty=null), source (sprint|tat|import), last_validated_at (ISO date), validation_count

import fs from "node:fs";
import { parse } from "node:path";

// minimal CSV parser (handles commas inside quotes + empty fields)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const b = (s: string): boolean => s.toLowerCase() === "true";
const n = (s: string): number | null => (s === "" || s == null ? null : Number(s));
const QUOTE = String.fromCharCode(34); // "
const s = (v: string | null | undefined): string => {
  if (v == null) return "null";
  const escaped = v.split(QUOTE).join("\\" + QUOTE);
  return QUOTE + escaped + QUOTE;
};

function venueToTS(row: Record<string, string>): string {
  const intents = row.intents.split(";").map((x) => `"${x.trim()}"`).join(", ");
  const videoUrl = row.video_url === "" ? "null" : `"${row.video_url}"`;
  return `  {
    id: ${s(row.venue_id)},
    name_th: ${s(row.name_th)},
    zone_id: ${s(row.zone_id)},
    category: ${s(row.category)} as Venue["category"],
    intents: [${intents}] as Intent[],
    badge: ${s(row.badge)} as Badge,
    hit_rank: ${n(row.hit_rank) ?? "null"},
    unseen_rank: ${n(row.unseen_rank) ?? "null"},
    transition_rank: ${n(row.transition_rank) ?? "null"},
    attributes: {
      plugs: ${s(row.plugs)} as Plugs,
      wifi_mbps: ${n(row.wifi_mbps) ?? "null"},
      seat_hours: ${n(row.seat_hours) ?? "null"},
      noise: ${s(row.noise)} as Noise,
      parking: ${b(row.parking)},
      food_level: ${s(row.food_level)} as FoodLevel,
      indoor: ${b(row.indoor)},
      shade: ${b(row.shade)},
    },
    price_per_head_min: ${Number(row.price_per_head_min)},
    price_per_head_max: ${Number(row.price_per_head_max)},
    open_time: ${s(row.open_time)},
    close_time: ${s(row.close_time)},
    walk_min_from_hub: ${Number(row.walk_min_from_hub)},
    video_url: ${videoUrl},
    source: ${s(row.source)} as Venue["source"],
    last_validated_at: ${s(row.last_validated_at)},
    validation_count: ${Number(row.validation_count)},
  },`;
}

function main() {
  const inputPath = process.argv[2];
  const text = inputPath ? fs.readFileSync(inputPath, "utf8") : fs.readFileSync(0, "utf8");
  const rows = parseCSV(text);
  if (rows.length < 2) {
    console.error("CSV must have header + at least 1 row");
    process.exit(1);
  }
  const header = rows[0];
  const dataRows = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });

  const venuesTS = dataRows.map(venueToTS).join("\n");

  const output = `// Fixtures — generated from CSV by tests/csv-to-fixtures.ts
// แหล่ง: W2 field sprint — ห้ามแก้มือ, รัน script ใหม่ทุกครั้งที่ CSV เปลี่ยน
import type { Badge, FoodLevel, Intent, Noise, Plugs, Route, Venue, Zone } from "./types";

export const ZONES: Zone[] = [
  { id: "bangkapi", name_th: "บางกะปิ", is_origin: true, km_to_siam: 13 },
  { id: "ladprao", name_th: "ลาดพร้าว", is_origin: true, km_to_siam: 10 },
  { id: "onnut", name_th: "อ่อนนุช", is_origin: true, km_to_siam: 11 },
  { id: "pinklao", name_th: "ปิ่นเกล้า", is_origin: true, km_to_siam: 12 },
  { id: "chatuchak", name_th: "จตุจักร", is_origin: true, km_to_siam: 9 },
  { id: "bangna", name_th: "บางนา", is_origin: true, km_to_siam: 18 },
  { id: "siam", name_th: "สยาม", is_origin: false, km_to_siam: 0 },
];

export const VENUES: Venue[] = [
${venuesTS}
];

// TODO: เก็บ routes จริงใน W2 (ตอนนี้ใช้ seeded ROUTES ในไฟล์เดิม)
// export const ROUTES: Route[] = [...];

export const BUDGET_DEFAULTS: Record<Intent, number> = {
  work: 450,
  date: 900,
  family: 1200,
  photo: 600,
};

export const LAUNCH_ZONE = "siam";
export const STALE_DAYS = 45;
`;

  console.log(output);
}

main();