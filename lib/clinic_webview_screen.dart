import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'app_config.dart';

/// Hosts the live clinic web app in a native WebView, with the bits a bare
/// WebView doesn't give you for free: a branded splash while it boots, a
/// retry screen on connection failure, pull-to-refresh, and Android
/// back-button support that navigates the web app's own history first.
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
          onPageStarted: (_) {
            if (mounted) setState(() => _state = _LoadState.loading);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _state = _LoadState.ready);
          },
          onWebResourceError: (error) {
            // Ignore sub-resource errors (fonts/CDN hiccups); only bail out
            // to the retry screen for the main frame failing to load.
            if (error.isForMainFrame ?? true) {
              if (mounted) {
                setState(() {
                  _state = _LoadState.error;
                  _errorMessage = error.description;
                });
              }
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(AppConfig.clinicAppUrl));
  }

  Future<void> _reload() async {
    setState(() => _state = _LoadState.loading);
    await _controller.reload();
  }

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
