import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dio/dio.dart';
import '../models/lead_number_model.dart';
import '../core/constants.dart';
import 'api_service.dart';
import 'call_log_service.dart';
import 'db_helper.dart';

class SyncService {
  final ApiService _apiService = ApiService();

  String _normalizeNumber(String num) {
    String cleaned = num.replaceAll(RegExp(r'\D'), '');
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(cleaned.length - 10);
    }
    return cleaned;
  }

  Future<void> sendHeartbeat() async {
    try {
      print('--- HEARTBEAT ---');
      await _apiService.client.post('/api/callpulse/agent/heartbeat', data: {
        'device_id': 'flutter_agent'
      });
    } catch (e) {
      print('Heartbeat failed: $e');
    }
  }

  Future<Map<String, dynamic>> syncMatchedCalls({void Function(String)? onProgress, bool background = false}) async {
    final prefs = await SharedPreferences.getInstance();
    try {
      onProgress?.call("Checking permissions...");
      if (!background) {
        final status = await Permission.phone.request();
        final hasCallLog = await CallLogService.requestPermission();
        if (!status.isGranted || !hasCallLog) {
          await prefs.setString(Constants.lastSyncStatusKey, 'Permission Missing');
          await prefs.setString(Constants.lastSyncErrorKey, 'Phone/Call log permission denied');
          return {'success': false, 'message': 'Call Log permission is required for Corporate Sync.', 'lastError': 'Permission denied'};
        }
      }

      await prefs.setString(Constants.lastSyncStatusKey, 'Active');
      await sendHeartbeat();
      
      String apiBaseUrl = _apiService.client.options.baseUrl;
      print('API base URL: $apiBaseUrl');

      onProgress?.call("Fetching assigned leads...");
      print('--- FETCH ASSIGNED LEADS ---');
      final response = await _apiService.client.get('/api/callpulse/my-lead-numbers');
      await prefs.setInt(Constants.lastLeadsRefreshKey, DateTime.now().millisecondsSinceEpoch);

      final responseData = response.data;
      List<dynamic> leadsJson = [];

      if (responseData is List) {
        leadsJson = responseData;
      } else if (responseData is Map && responseData['data'] is List) {
        leadsJson = responseData['data'];
      } else if (responseData is Map && responseData['leads'] is List) {
        leadsJson = responseData['leads'];
      } else {
        throw Exception('Invalid lead response format: $responseData');
      }

      final leads = leadsJson
          .map((json) => LeadNumberModel.fromJson(Map<String, dynamic>.from(json)))
          .toList();

      int botCount = 0;
      int directCount = 0;
      int freeCount = 0;
      int transferredCount = 0;

      Map<String, Map<String, dynamic>> leadsMap = {};
      for (var lead in leads) {
        if (lead.leadType == 'BOT') botCount++;
        if (lead.leadType == 'DIRECT') directCount++;
        if (lead.leadType == 'FREE') freeCount++;
        if (lead.leadType == 'TRANSFERRED') transferredCount++;

        String sourceNum = lead.contactLast10.isNotEmpty ? lead.contactLast10 : lead.leadContact;
        String normNum = _normalizeNumber(sourceNum);
        
        if (leadsMap.containsKey(normNum)) {
          final existingType = leadsMap[normNum]!['type'];
          // FREE or BOT should take precedence over DIRECT, FREE over BOT
          if (existingType == 'DIRECT' && (lead.leadType == 'BOT' || lead.leadType == 'FREE')) {
            leadsMap[normNum] = {
              'type': lead.leadType,
              'id': lead.leadId
            };
          } else if (existingType == 'BOT' && lead.leadType == 'FREE') {
            leadsMap[normNum] = {
              'type': lead.leadType,
              'id': lead.leadId
            };
          }
        } else {
          leadsMap[normNum] = {
            'type': lead.leadType,
            'id': lead.leadId
          };
        }
      }

      print('GET /api/callpulse/my-lead-numbers response count: ${leads.length}');
      print('Counts by type - BOT: $botCount, DIRECT: $directCount, FREE: $freeCount');

      onProgress?.call("Reading call logs...");
      final now = DateTime.now();
      final todayMidnight = DateTime(now.year, now.month, now.day);
      
      int lastScan = prefs.getInt(Constants.lastCallLogScanKey) ?? todayMidnight.millisecondsSinceEpoch;
      final lastScannedMinus5 = DateTime.fromMillisecondsSinceEpoch(lastScan).subtract(const Duration(minutes: 5));
      
      DateTime scanFrom = lastScannedMinus5.isAfter(todayMidnight) ? lastScannedMinus5 : todayMidnight;
      
      final callLogs = await CallLogService.getCallLogs();
      await prefs.setInt(Constants.lastCallLogScanKey, DateTime.now().millisecondsSinceEpoch);
      
      print('fetched phone call logs count: ${callLogs.length}');

      onProgress?.call("Matching CRM calls...");
      List<Map<String, dynamic>> matchedLogs = [];
      int matchedBotCalls = 0;
      int matchedDirectCalls = 0;
      int matchedFreeCalls = 0;
      int matchedTransferredCalls = 0;
      
      for (var log in callLogs) {
        String dateStr = log['date'] ?? '';
        DateTime callDate;
        try {
          callDate = DateTime.parse(dateStr);
        } catch (e) {
          continue; // skip invalid date
        }

        if (callDate.isBefore(scanFrom)) {
          continue; // Filter manually
        }

        String originalNum = log['number']?.toString() ?? '';
        String normNum = _normalizeNumber(originalNum);

        bool contains = leadsMap.containsKey(normNum);
        bool isAppButton = false;
        
        final activeLeadType = prefs.getString('activeLeadType');
        final activeLeadId = prefs.getInt('activeLeadId');
        final activeNumber = prefs.getString('activeNumber');
        
        if (activeNumber != null && activeLeadType != null && activeLeadId != null) {
          if (activeNumber == normNum) {
            contains = true;
            isAppButton = true;
            leadsMap[normNum] = {
              'type': activeLeadType,
              'id': activeLeadId
            };
            print('Active context forced mapping for $normNum to $activeLeadType $activeLeadId');
          }
        }

        if (contains) {
          final leadInfo = leadsMap[normNum]!;
          if (leadInfo['type'] == 'BOT') matchedBotCalls++;
          if (leadInfo['type'] == 'DIRECT') matchedDirectCalls++;
          if (leadInfo['type'] == 'FREE') matchedFreeCalls++;
          if (leadInfo['type'] == 'TRANSFERRED') matchedTransferredCalls++;
          
          int durationSeconds = 0;
          if (log['duration'] is int) {
             durationSeconds = log['duration'];
          } else if (log['duration'] is String) {
             durationSeconds = int.tryParse(log['duration']) ?? 0;
          }

          matchedLogs.add({
            'device_call_log_id': log['id']?.toString(),
            'raw_phone_number': originalNum,
            'app_call_source': isAppButton ? 'APP_BUTTON' : 'BACKGROUND_SYNC',
            'lead_type': leadInfo['type'],
            'lead_id': leadInfo['id'],
            'dialed_number': originalNum,
            'normalized_number': normNum,
            'call_type': log['type'] ?? 'UNKNOWN',
            'call_started_at': callDate.toUtc().toIso8601String(),
            'call_ended_at': callDate.add(Duration(seconds: durationSeconds)).toUtc().toIso8601String(),
            'duration_seconds': durationSeconds,
          });
          
          print('Matched CRM lead for phone $normNum -> lead_type: ${leadInfo['type']}, lead_id: ${leadInfo['id']}');
          print('Added to upload payload: lead_type: ${leadInfo['type']}, lead_id: ${leadInfo['id']}');
        }
      }

      print('matched logs count: ${matchedLogs.length}');

      int uploadedBotCalls = 0;
      int uploadedDirectCalls = 0;
      int uploadedFreeCalls = 0;
      int uploadedTransferredCalls = 0;
      int skippedDuplicates = 0;
      int failedUploads = 0;
      String lastErrorMessage = '';

      onProgress?.call("Uploading matched calls...");
      var connectivityResult = await (Connectivity().checkConnectivity());
      if (!connectivityResult.contains(ConnectivityResult.none)) {
        if (matchedLogs.isNotEmpty) {
          try {
            final uploadResp = await _apiService.client.post('/api/callpulse/sync', data: {
              'callLogs': matchedLogs
            });
            print('POST /api/callpulse/sync status code: ${uploadResp.statusCode}');
            print('API response body: ${uploadResp.data}');
            
            if (uploadResp.statusCode == 200 || uploadResp.statusCode == 201) {
              int inserted = uploadResp.data['inserted'] ?? 0;
              skippedDuplicates = uploadResp.data['duplicates'] ?? 0;
              final breakdown = uploadResp.data['breakdown'] ?? {};
              uploadedBotCalls = breakdown['BOT'] ?? 0;
              uploadedDirectCalls = breakdown['DIRECT'] ?? 0;
              uploadedFreeCalls = breakdown['FREE'] ?? 0;
              uploadedTransferredCalls = breakdown['TRANSFERRED'] ?? 0;
            } else {
              failedUploads = matchedLogs.length;
              lastErrorMessage = 'Status code: ${uploadResp.statusCode}';
            }
          } on DioException catch (e) {
            failedUploads = matchedLogs.length;
            print('POST /api/callpulse/sync status code: ${e.response?.statusCode}');
            lastErrorMessage = e.response?.data?['message'] ?? 'Network error uploading log';
          } catch (e) {
            failedUploads = matchedLogs.length;
            lastErrorMessage = 'Error uploading log';
          }
        }
      } else {
        lastErrorMessage = 'No internet connection';
      }

      String todayStr = todayMidnight.toIso8601String();
      String storedTodayStr = prefs.getString(Constants.todayMatchedCallsDateKey) ?? '';
      int currentTodayMatched = prefs.getInt(Constants.todayMatchedCallsCountKey) ?? 0;
      
      if (storedTodayStr != todayStr) {
        currentTodayMatched = matchedLogs.length;
        await prefs.setString(Constants.todayMatchedCallsDateKey, todayStr);
      } else {
        currentTodayMatched += matchedLogs.length;
      }
      await prefs.setInt(Constants.todayMatchedCallsCountKey, currentTodayMatched);

      await prefs.setInt(Constants.lastSyncKey, DateTime.now().millisecondsSinceEpoch);
      if (failedUploads == 0 && lastErrorMessage.isEmpty) {
        await prefs.setInt(Constants.lastSuccessfulSyncKey, DateTime.now().millisecondsSinceEpoch);
        await prefs.setString(Constants.lastSyncStatusKey, 'Active');
        await prefs.setString(Constants.lastSyncErrorKey, '');
        
        await prefs.remove('activeLeadType');
        await prefs.remove('activeLeadId');
        await prefs.remove('activeNumber');
      } else {
        await prefs.setString(Constants.lastSyncStatusKey, 'Error');
        await prefs.setString(Constants.lastSyncErrorKey, lastErrorMessage);
      }

      onProgress?.call("Sync Completed");
      
      String displayMsg = '';
      if (leads.isEmpty) {
        displayMsg = "No assigned CRM leads found.";
      } else if (matchedLogs.isEmpty) {
        displayMsg = "No new CRM-matched calls found.";
      } else if (failedUploads == 0) {
        displayMsg = "Corporate sync completed successfully.";
      } else {
        displayMsg = "Sync encountered errors: $lastErrorMessage";
      }

      return {
        'success': failedUploads == 0,
        'message': displayMsg,
        'fetchedCallLogs': callLogs.length,
        'assignedLeadNumbers': leads.length,
        'botLeads': botCount,
        'directLeads': directCount,
        'freeLeads': freeCount,
        'transferredLeads': transferredCount,
        'matchedBotCalls': matchedBotCalls,
        'matchedDirectCalls': matchedDirectCalls,
        'matchedFreeCalls': matchedFreeCalls,
        'matchedTransferredCalls': matchedTransferredCalls,
        'uploadedBotCalls': uploadedBotCalls,
        'uploadedDirectCalls': uploadedDirectCalls,
        'uploadedFreeCalls': uploadedFreeCalls,
        'uploadedTransferredCalls': uploadedTransferredCalls,
        'skippedDuplicates': skippedDuplicates,
        'failedUploads': failedUploads,
        'lastError': lastErrorMessage
      };

    } on DioException catch (e) {
       String errMsg = 'Server error. Please try again later.';
       if (e.response?.statusCode == 401) {
         errMsg = 'Session expired. Please login again.';
       } else if (e.response?.statusCode == 404) {
         errMsg = 'Server route not found. Please check API Base URL.';
       } else if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.connectionError || e.type == DioExceptionType.unknown) {
         errMsg = 'Server not reachable. Please check WiFi/API Base URL.';
       }
       await prefs.setString(Constants.lastSyncStatusKey, 'Error');
       await prefs.setString(Constants.lastSyncErrorKey, errMsg);
       return {'success': false, 'message': errMsg, 'lastError': errMsg};
    } catch (e) {
       await prefs.setString(Constants.lastSyncStatusKey, 'Error');
       await prefs.setString(Constants.lastSyncErrorKey, e.toString());
       return {'success': false, 'message': 'Unknown error occurred.', 'lastError': e.toString()};
    }
  }
}
