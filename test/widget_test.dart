import 'package:flutter_test/flutter_test.dart';

import 'package:medical_clinic/app_config.dart';

void main() {
  test('clinic app URL points at the live Supabase edge function', () {
    expect(AppConfig.clinicAppUrl, startsWith('https://'));
    expect(AppConfig.clinicAppUrl, contains('.supabase.co/functions/v1/'));
  });
}
