/* Service Worker لتشغيل نظام إدارة العيادات حتى بدون إنترنت.
   الاستراتيجية: صفحة التطبيق نفسها "الشبكة أولاً" — أي زيارة فيها نت بتاخد آخر نسخة منشورة فورًا،
   ولو الشبكة فشلت بيتم الرجوع لآخر نسخة محفوظة. مكتبات الـCDN (React/Babel/Supabase/Tailwind) والخطوط
   "الكاش أولاً" لأنها روابط ثابتة بنفس الإصدار. طلبات Supabase نفسها (قاعدة البيانات) ما بتتلمسش هنا خالص —
   البرنامج بيتعامل معاها بمنطقه الخاص (قائمة انتظار العمل بدون اتصال). */

const CACHE_VERSION = "v1";
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
    try {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.add(new Request("./", { cache: "reload" }));
    } catch (e) { /* أفضل محاولة فقط — لو فشلت متعملش حاجة */ }
    try {
      const vendorCache = await caches.open(VENDOR_CACHE);
      await Promise.all(
        VENDOR_URLS.map((u) => vendorCache.add(new Request(u, { mode: "no-cors" })).catch(() => {}))
      );
    } catch (e) { /* أفضل محاولة فقط */ }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== VENDOR_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

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
    // صفحة التطبيق نفسها: شبكة أولاً — أي تحديث بننشره يوصل فورًا لو فيه نت
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isVendor || isFontHost) {
    // مكتبات وخطوط ثابتة: كاش أولاً + تحديث في الخلفية
    event.respondWith((async () => {
      const cache = await caches.open(VENDOR_CACHE);
      const cached = await cache.match(req);
      const network = fetch(new Request(req.url, { mode: "no-cors" }))
        .then((res) => { cache.put(req, res.clone()); return res; })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })());
  }
});
