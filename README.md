# عيادتي — تطبيق الموبايل (نظام إدارة العيادات)

النظام الأونلاين (حجز مواعيد، سجل طبي، أطباء، مالية، مخزن، صلاحيات...) شغّال بالفعل
ك‑Backend + واجهة ويب حيّة على Supabase. الريبو ده يحتوي على **تطبيق موبايل Flutter**
(Android + iOS) بيستضيف نفس النظام كتطبيق حقيقي قابل للتثبيت — بدون إعادة بناء أي حاجة.

بكرة، تقدر تحوّل أي شاشة لواجهة موبايل native حقيقية (Flutter widgets بدل الويب) خطوة
خطوة، من غير ما توقف الشغل الحالي.

## إزاي شغّال

- الرابط الحي للنظام: `https://lwfmadhegsvjzsgcegho.supabase.co/functions/v1/clinic`
  (معرّف في `lib/app_config.dart`)
- التطبيق عبارة عن غلاف Flutter (`webview_flutter`) حوالين الرابط ده، مع:
  - شاشة تحميل وثيم متوافقين مع ألوان النظام (تركواز `#115E59`).
  - إعادة محاولة تلقائية عند فشل الاتصال.
  - زر الرجوع في أندرويد بيرجع في تاريخ الصفحة جوه التطبيق الأول.
  - أيقونة وSplash Screen مبنيين على شكل سن 🦷.
- أي تعديل على النظام نفسه (شاشات، بيانات، صلاحيات) بيحصل من مكانه الأصلي على Supabase،
  والتطبيق بيعكسه تلقائي من غير أي تحديث للتطبيق.

## تشغيل محلي

```bash
flutter pub get
flutter run          # على جهاز/محاكي متصل
```

## بناء تطبيق أندرويد (APK) جاهز للتثبيت

**تلقائي (الأسهل):** كل push على الفرع بيشغّل GitHub Actions
(`.github/workflows/build-apk.yml`) وبيطلع APK جاهز تحت تبويب **Actions → أحدث run →
Artifacts → medical-clinic-app-release**. نزّله وثبّته على أي جهاز أندرويد مباشرة
(محتاج تفعيل "تثبيت من مصادر غير معروفة" لأول مرة).

**محلي:**

```bash
flutter build apk --release
# الملف: build/app/outputs/flutter-apk/app-release.apk
```

## بناء تطبيق iOS

محتاج جهاز Mac مع Xcode وحساب Apple Developer (٩٩$/سنة) للنشر على App Store، أو للتوقيع
والتجربة على جهاز حقيقي:

```bash
flutter build ios --release
# افتح ios/Runner.xcworkspace في Xcode للتوقيع والرفع
```

## تغيير الشكل لاحقًا

- **اسم التطبيق / الأيقونة:** غيّر الصور في `assets/icon/` وشغّل
  `dart run flutter_launcher_icons` و `dart run flutter_native_splash:create` تاني.
- **الرابط:** غيّر `AppConfig.clinicAppUrl` في `lib/app_config.dart`.
- **تحويل شاشة لـ native حقيقي:** ابدأ بشاشة واحدة (مثلاً "الحجز") — اعمل لها UI
  Flutter بيكلم Supabase مباشرة (`supabase_flutter` package)، واستبدلها في التنقل بدل
  ما تفتح جوه الـ WebView. باقي الشاشات تفضل شغالة كالمعتاد لحد ما تدّور عليها بالترتيب.

## هيكل المشروع

```
lib/
  main.dart                  # نقطة الدخول + الثيم + دعم العربي RTL
  app_config.dart            # رابط النظام والألوان
  clinic_webview_screen.dart # الشاشة الرئيسية (WebView + إعادة المحاولة)
assets/icon/                 # مصدر الأيقونة وشاشة البداية
.github/workflows/           # بناء APK تلقائي عند كل push
```
