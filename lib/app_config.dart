/// Central place for the handful of values this wrapper app needs to know
/// about the clinic system it hosts.
///
/// The clinic web app (patients, appointments, doctors, finance, inventory,
/// permissions...) already runs live as a Supabase Edge Function backed by
/// the `app_assets.index.html` page and the project's Postgres schema. This
/// Flutter app does not reimplement any of that — it hosts it natively so it
/// installs like a real app on Android/iOS, and can be evolved screen by
/// screen into native UI later without throwing away the working backend.
class AppConfig {
  AppConfig._();

  /// The live clinic system. Change this if the Supabase project or the
  /// edge function slug ever changes.
  static const String clinicAppUrl =
      'https://lwfmadhegsvjzsgcegho.supabase.co/functions/v1/clinic';

  static const String appTitle = 'نظام إدارة العيادات';

  static const int brandColor = 0xFF115E59; // matches the web app's teal
  static const int brandBackground = 0xFFF2F7F6;
}
