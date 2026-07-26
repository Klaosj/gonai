// preflight CLI — รันก่อน deploy: npm run preflight
// ตั้ง env ให้เหมือนที่จะใช้บน host แล้วรัน (อ่านจาก process.env ตรงๆ)
import { preflightChecks } from "../lib/preflight";

const checks = preflightChecks(process.env);
let failed = 0;

console.log("GoNai preflight — ตรวจ env สำหรับ production\n");
for (const c of checks) {
  const mark = c.ok ? "✓" : c.required ? "✗" : "⚠";
  if (!c.ok && c.required) failed++;
  console.log(`  ${mark} ${c.name}${c.ok ? "" : ` — ${c.hint}`}`);
}

if (failed > 0) {
  console.error(`\n${failed} required check(s) failed — ยังไม่พร้อม deploy`);
  process.exit(1);
}
console.log("\npreflight ผ่าน — พร้อม deploy (หลัง deploy อย่าลืมผูก /api/health กับ UptimeRobot)");
