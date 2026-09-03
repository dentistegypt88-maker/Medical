#!/usr/bin/env node
/*
 * فحص أساسي لـ docs/index.html قبل أي نشر — الجزء الوحيد من الفحص اللي بيوقف الـCI عند الفشل هو
 * صحة صيغة JSX/Babel، لأن التطبيق كله في سكريبت واحد بدون خطوة بناء: أي خطأ صياغي هنا معناه
 * البرنامج بالكامل بيقف. باقي الفحوصات معلوماتية بس (بتحتاج مراجعة بشرية) لأنها ممكن تختلف
 * بشكل طبيعي مع نمو الملف.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { transformSync } from "@babel/core";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlPath = path.join(root, "docs", "index.html");
const html = readFileSync(htmlPath, "utf-8");

const scriptMatch = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: لم يتم العثور على <script type=\"text/babel\"> في docs/index.html");
  process.exit(1);
}

try {
  transformSync(scriptMatch[1], { presets: ["@babel/preset-react", "@babel/preset-env"] });
  console.log(`OK: صيغة JSX/Babel صحيحة (${scriptMatch[1].length} حرف من إجمالي ${html.length})`);
} catch (e) {
  console.error("FAIL: خطأ في صيغة JSX/Babel:\n" + e.message);
  process.exit(1);
}

console.log("\nتوازن الوسوم (معلوماتي — راجع يدويًا لو رقم غريب فجأة):");
for (const tag of ["div", "button", "svg", "section", "textarea", "script"]) {
  const open = (html.match(new RegExp("<" + tag + "(?=[ >])", "g")) || []).length;
  const close = (html.match(new RegExp("</" + tag + ">", "g")) || []).length;
  console.log(`  ${tag}: open=${open} close=${close}`);
}

console.log("\nتم — الفحص ده بيغطي الصياغة بس، مش منطق الأعمال. شوف scripts/test-money-math.mjs لاختبارات حسابات فعلية.");
