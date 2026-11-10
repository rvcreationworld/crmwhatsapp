import 'package:flutter/services.dart';

class CallLogService {
  static const MethodChannel _channel =
      MethodChannel('com.cyberking.callpulse/call_log');

  static Future<List<Map<String, dynamic>>> getCallLogs() async {
    try {
      print("Calling native getCallLogs...");
      final result = await _channel.invokeMethod<List<dynamic>>('getCallLogs');

      if (result == null) {
        print("Native getCallLogs returned 0 logs");
        return [];
      }

      print("Native getCallLogs returned ${result.length} logs");
      return result
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } on PlatformException catch (e) {
      print("Failed to get call logs: '${e.message}'.");
      return [];
    } catch (e) {
      print("Error in CallLogService: $e");
      return [];
    }
  }
  static Future<bool> requestPermission() async {
    try {
      final result = await _channel.invokeMethod<bool>('requestCallLogPermission');
      return result ?? false;
    } catch (e) {
      print("Failed to request permission: $e");
      return false;
    }
  }
}
