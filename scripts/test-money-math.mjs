#!/usr/bin/env node
/*
 * اختبار وحدة حقيقي لـ contractSplit (حساب توزيع سعر الكشف بين المريض والجهة/النقابة عند وجود
 * تعاقد وخصم) — بيستخرج الدالة نفسها من docs/index.html بدل ما يعيد كتابتها، عشان الاختبار
 * يفشل فورًا لو حد غيّر منطق الدالة الحقيقي من غير ما ينتبه. لو الاستخراج فشل (تغيّر اسم الدالة
 * أو شكلها) الاختبار بيفشل بوضوح بدل ما يتجاهل الموضوع بصمت.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(path.join(root, "docs", "index.html"), "utf-8");

const m = html.match(/const contractSplit = \(price, contract\) => \{[\s\S]*?\n\};/);
if (!m) {
  console.error("FAIL: تعذر استخراج contractSplit من docs/index.html — الدالة اتغيّرت أو اتنقلت. حدّث هذا الاختبار.");
  process.exit(1);
}
const fnSource = m[0].replace(/^const contractSplit = /, "").replace(/;\s*$/, "");
const contractSplit = new Function(`return (${fnSource})`)();

let failures = 0;
const check = (label, actual, expected) => {
  try {
    assert.deepEqual(actual, expected);
    console.log(`OK: ${label}`);
  } catch (e) {
    failures++;
    console.error(`FAIL: ${label}\n  متوقع: ${JSON.stringify(expected)}\n  فعلي:  ${JSON.stringify(actual)}`);
  }
};

check(
  "من غير تعاقد — كل السعر على المريض",
  contractSplit(1000, null),
  { net: 1000, patientShare: 1000, entityShare: 0 }
);
check(
  "تعاقد خصم 10% ونسبة المريض 100% — الصافي 900 كله على المريض",
  contractSplit(1000, { discount: 10, patientPct: 100 }),
  { net: 900, patientShare: 900, entityShare: 0 }
);
check(
  "تعاقد خصم 20% ونسبة المريض 50% — الصافي 800، نص ونص",
  contractSplit(1000, { discount: 20, patientPct: 50 }),
  { net: 800, patientShare: 400, entityShare: 400 }
);
check(
  "نسبة المريض صفر — كل الصافي على الجهة",
  contractSplit(500, { discount: 0, patientPct: 0 }),
  { net: 500, patientShare: 0, entityShare: 500 }
);
check(
  "خصم 100% — الصافي صفر",
  contractSplit(500, { discount: 100, patientPct: 100 }),
  { net: 0, patientShare: 0, entityShare: 0 }
);

if (failures > 0) {
  console.error(`\n${failures} اختبار فشل من أصل 5.`);
  process.exit(1);
}
console.log("\nOK: كل اختبارات contractSplit عدّت (5/5).");
