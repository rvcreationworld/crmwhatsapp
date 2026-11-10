import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static const MethodChannel _channel = MethodChannel('com.cyberking.callpulse/call_log');

  static Future<bool> checkPermissions() async {
    // Phone permission via permission_handler
    final phoneStatus = await Permission.phone.status;
    
    // Call Log permission via Native Kotlin check
    bool hasCallLog = false;
    try {
      // By calling getCallLogs, if it returns PERMISSION_DENIED, we know we don't have it.
      // Alternatively, we can just request it below.
      final result = await _channel.invokeMethod<List<dynamic>>('getCallLogs');
      hasCallLog = true;
    } catch (e) {
      hasCallLog = false;
    }
    
    return phoneStatus.isGranted && hasCallLog;
  }

  static Future<bool> requestPermissionsWithExplanation(BuildContext context) async {
    // Show Explanation Dialog
    bool? proceed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext ctx) {
        return AlertDialog(
          title: const Text('Privacy & Permissions'),
          content: const Text(
            'CallPulse only reads call logs to match your assigned CRM leads. '
            'Personal calls are ignored and never uploaded.'
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('I Understand'),
            ),
          ],
        );
      },
    );

    if (proceed != true) {
      return false;
    }

    // 1. Request Phone Permission
    final phoneResult = await Permission.phone.request();
    if (!phoneResult.isGranted) {
      _showSettingsDialog(context);
      return false;
    }

    // 2. Request Call Log Permission natively
    try {
      // Try to invoke. If it succeeds, we have permission.
      // If it throws PERMISSION_DENIED, we trigger the native permission prompt.
      final result = await _channel.invokeMethod<List<dynamic>>('getCallLogs');
      return true;
    } catch (e) {
       // Since it threw an error, it means we lack permission. We will ask native code to request it.
       try {
         final granted = await _channel.invokeMethod<bool>('requestCallLogPermission');
         if (granted == true) {
           return true;
         } else {
           _showSettingsDialog(context);
           return false;
         }
       } catch (ex) {
         _showSettingsDialog(context);
         return false;
       }
    }
  }

  static void _showSettingsDialog(BuildContext context) {
    if (context.mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Permission Required'),
          content: const Text('Permissions were denied. Please enable them in App Settings.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                openAppSettings();
                Navigator.of(ctx).pop();
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
    }
  }
}
