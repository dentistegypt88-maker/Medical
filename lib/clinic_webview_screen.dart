import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'app_config.dart';

/// Hosts the live clinic web app in a native WebView, with the bits a bare
/// WebView doesn't give you for free: a branded splash while it boots, a
/// retry screen on connection failure, and Android back-button support that
/// navigates the web app's own history first.
///
/// Supabase's gateway unconditionally rewrites a GET response's
/// `text/html` content-type to `text/plain` (documented platform behavior,
/// not specific to this project) — so simply navigating the WebView to
/// [AppConfig.clinicAppUrl] renders the raw source instead of the page.
/// Fetching the bytes ourselves and handing them to [loadHtmlString]
/// bypasses that entirely, since it never looks at the server's headers.
class ClinicWebViewScreen extends StatefulWidget {
  const ClinicWebViewScreen({super.key});

  @override
  State<ClinicWebViewScreen> createState() => _ClinicWebViewScreenState();
}

enum _LoadState { loading, ready, error }

class _ClinicWebViewScreenState extends State<ClinicWebViewScreen> {
  late final WebViewController _controller;
  _LoadState _state = _LoadState.loading;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(AppConfig.brandBackground))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _state = _LoadState.ready);
          },
        ),
      );
    // The GPS-verified attendance check-in calls navigator.geolocation from
    // inside the page. A WebView geolocation prompt alone doesn't grant the
    // OS-level location permission on Android, so request it ourselves and
    // feed the result back to the WebView's prompt.
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          final status = await Permission.location.request();
          return GeolocationPermissionsResponse(
            allow: status.isGranted,
            retain: true,
          );
        },
      );
    }
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _state = _LoadState.loading;
      _errorMessage = null;
    });
    try {
      final response = await http
          .get(Uri.parse(AppConfig.clinicAppUrl))
          .timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) {
        throw Exception('HTTP ${response.statusCode}');
      }
      // Decode as UTF-8 explicitly: the server's mislabeled content-type
      // has no charset, so trusting response.body's own guess garbles
      // Arabic text.
      final html = utf8.decode(response.bodyBytes);
      await _controller.loadHtmlString(html, baseUrl: AppConfig.clinicAppUrl);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _LoadState.error;
        _errorMessage = '$e';
      });
    }
  }

  Future<void> _reload() => _load();

  Future<bool> _handleBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _handleBack();
        if (!context.mounted || !shouldPop) return;
        Navigator.of(context).maybePop();
      },
      child: Scaffold(
        backgroundColor: const Color(AppConfig.brandBackground),
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_state == _LoadState.loading) _BootOverlay(),
              if (_state == _LoadState.error)
                _ErrorOverlay(
                  message: _errorMessage,
                  onRetry: _reload,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BootOverlay extends StatelessWidget {
  const _BootOverlay();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(AppConfig.brandBackground),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          CircularProgressIndicator(color: Color(AppConfig.brandColor)),
          SizedBox(height: 16),
          Text(
            AppConfig.appTitle,
            style: TextStyle(
              color: Color(AppConfig.brandColor),
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorOverlay extends StatelessWidget {
  const _ErrorOverlay({required this.onRetry, this.message});

  final Future<void> Function() onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(AppConfig.brandBackground),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, size: 56, color: Color(AppConfig.brandColor)),
          const SizedBox(height: 16),
          const Text(
            'تعذر الاتصال بالنظام',
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          const Text(
            'تأكد من اتصال الإنترنت ثم أعد المحاولة.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.black54),
          ),
          if (message != null) ...[
            const SizedBox(height: 8),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black38, fontSize: 11),
            ),
          ],
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('إعادة المحاولة'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(AppConfig.brandColor),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }
}
