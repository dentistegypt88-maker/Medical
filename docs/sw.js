/* Service Worker لتشغيل نظام إدارة العيادات حتى بدون إنترنت.
   الاستراتيجية: "الشبكة أولاً" لكل حاجة بيتحكم فيها هنا (صفحة التطبيق + مكتبات الـCDN + الخطوط) —
   أي زيارة فيها نت بتاخد آخر نسخة فعليًا من المصدر، والكاش بيُستخدم بس لو الشبكة فشلت فعلاً (رفض
   الطلب نفسه، مش مجرد رد غير مثالي). ده مهم خصوصًا لمكتبات CDN اللي بنحمّلها بوضع no-cors: الرد
   بييجي "معتم" (opaque) ومينفعش نتأكد من كود الحالة الحقيقي بتاعه، فلو خزّناه كـ"كاش أساسي" ممكن
   رد فاشل من الشبكة (اتصال ضعيف) يتخزن ويفضل يتقدَّم على أي محاولة تانية للأبد. الشبكة أولاً بتمنع
   السيناريو ده: الكاش بيبقى مجرد شبكة أمان أخيرة، مش مصدر افتراضي. طلبات Supabase نفسها (قاعدة
   البيانات والمصادقة) ما بتتلمسش هنا خالص — البرنامج بيتعامل معاها بمنطقه الخاص (قائمة انتظار
   العمل بدون اتصال). */

const CACHE_VERSION = "v2";
const SHELL_CACHE = "clinic-shell-" + CACHE_VERSION;
const VENDOR_CACHE = "clinic-vendor-" + CACHE_VERSION;

const VENDOR_URLS = [
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    self.skipWaiting();
    // ملاحظة: مفيش تخزين مسبق وقت التثبيت — الكاش بيتبني بس من نجاح فعلي أثناء fetch، عشان محدش
    // يخزّن رد سيء من غير ما نحاول نحدّثه أول فرصة بعدها.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== VENDOR_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName, fetchReq) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(fetchReq || req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // اطلبات الكتابة (POST/PATCH/DELETE) متتلمسش خالص

  const url = new URL(req.url);

  // قاعدة البيانات والمصادقة (Supabase) — دايمًا شبكة مباشرة، البرنامج نفسه بيتعامل مع انقطاعها
  if (url.hostname.endsWith(".supabase.co")) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isFontHost = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isVendor = VENDOR_URLS.includes(req.url);

  if (isSameOrigin) {
    event.respondWith(networkFirst(req, SHELL_CACHE).catch(() => Response.error()));
    return;
  }

  if (isVendor || isFontHost) {
    // وضع no-cors إجباري هنا (روابط cdnjs/jsdelivr مش كلها بترجّع رؤوس CORS) — الرد بيبقى معتم
    // ومينفعش نقرأ حالته، فالشبكة أولاً هي اللي بتمنع تخزين رد فاشل كأساسي.
    event.respondWith(networkFirst(req, VENDOR_CACHE, new Request(req.url, { mode: "no-cors" })).catch(() => Response.error()));
  }
});
