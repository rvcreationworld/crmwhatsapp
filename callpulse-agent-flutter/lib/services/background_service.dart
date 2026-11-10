import 'dart:async';
import 'dart:ui';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'sync_service.dart';

const notificationChannelId = 'callpulse_background_sync_channel';
const notificationId = 888;

Future<void> initializeService() async {
  final service = FlutterBackgroundService();

  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    notificationChannelId, // id
    'CallPulse Sync Service', // title
    description: 'This channel is used for CallPulse background sync.', // description
    importance: Importance.low,
  );

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: false,
      isForegroundMode: true,
      notificationChannelId: notificationChannelId,
      initialNotificationTitle: 'CallPulse Agent',
      initialNotificationContent: 'CallPulse is running and syncing CRM-matched calls.',
      foregroundServiceNotificationId: notificationId,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  WidgetsFlutterBinding.ensureInitialized();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Fetch initial preferences if needed
  SharedPreferences prefs = await SharedPreferences.getInstance();

  Timer.periodic(const Duration(seconds: 60), (timer) async {
    // Refresh preferences inside the isolate
    prefs.reload();

    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        final now = DateTime.now();
        String formattedTime = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

        flutterLocalNotificationsPlugin.show(
          notificationId,
          'CallPulse Agent',
          'CallPulse is running and syncing CRM-matched calls. Last check: $formattedTime',
          const NotificationDetails(
            android: AndroidNotificationDetails(
              notificationChannelId,
              'CallPulse Sync Service',
              icon: 'ic_bg_service_small',
              ongoing: true,
            ),
          ),
        );
      }
    }

    try {
      print('Background Timer triggered. Starting Sync...');
      final syncService = SyncService();
      // true for background to skip Permission.phone.request() which fails in background isolates
      await syncService.syncMatchedCalls(background: true);
      
      // Update UI if app is open
      service.invoke('update', {
        "current_date": DateTime.now().toIso8601String(),
      });
      
      print('Background Sync Complete.');
    } catch (e) {
      print('Background Sync Failed: $e');
    }
  });
}
