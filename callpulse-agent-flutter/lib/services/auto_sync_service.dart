import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:phone_state/phone_state.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import '../core/constants.dart';
import 'sync_service.dart';
import 'background_service.dart' as bg_service;

class AutoSyncService with WidgetsBindingObserver {
  static final AutoSyncService _instance = AutoSyncService._internal();
  factory AutoSyncService() => _instance;
  AutoSyncService._internal();

  final SyncService _syncService = SyncService();
  StreamSubscription<PhoneState>? _phoneStateSubscription;
  bool _isInitialized = false;
  bool _isSyncing = false;

  Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;
    WidgetsBinding.instance.addObserver(this);

    // Initialize background service
    await bg_service.initializeService();
    await checkAndStart();
  }

  Future<void> checkAndStart() async {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool(Constants.autoSyncEnabledKey) ?? true;
    
    if (!enabled) {
      await stop();
      return;
    }

    // Request necessary permissions
    final phonePerm = await Permission.phone.request();
    final notifPerm = await Permission.notification.request();

    if (!phonePerm.isGranted) {
      await prefs.setString(Constants.lastSyncStatusKey, 'Permission Missing');
      return;
    }

    await prefs.setString(Constants.lastSyncStatusKey, 'Active');

    // Start background service for 1-minute periodic sync
    final service = FlutterBackgroundService();
    if (!(await service.isRunning())) {
      await service.startService();
    }

    // Start phone state listener for call-end detection
    _startPhoneStateListener();

    // Trigger immediate sync on startup
    triggerSync();
  }

  void _startPhoneStateListener() {
    _phoneStateSubscription?.cancel();
    try {
      _phoneStateSubscription = PhoneState.stream.listen((event) {
        if (event.status == PhoneStateStatus.CALL_ENDED) {
          print('Phone state: CALL_ENDED detected. Triggering immediate sync...');
          // Add a slight delay to allow Android call logs to be updated by OS
          Future.delayed(const Duration(seconds: 3), () {
            triggerSync();
          });
        }
      });
    } catch (e) {
      print('Failed to start phone state listener: $e');
    }
  }

  Future<Map<String, dynamic>?> triggerSync({void Function(String)? onProgress}) async {
    if (_isSyncing) {
      print('Sync already in progress, skipping...');
      return null;
    }
    _isSyncing = true;
    try {
      return await _syncService.syncMatchedCalls(onProgress: onProgress);
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> stop() async {
    _phoneStateSubscription?.cancel();
    _phoneStateSubscription = null;
    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke('stopService');
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(Constants.lastSyncStatusKey, 'Paused');
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      print('App resumed. Triggering fallback sync...');
      triggerSync();
    }
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _phoneStateSubscription?.cancel();
  }
}
