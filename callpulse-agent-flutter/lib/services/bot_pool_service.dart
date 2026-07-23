import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class BotPoolService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> getStatus() async {
    try {
      final String baseUrl = _apiService.client.options.baseUrl;
      String url = '$baseUrl/api/telecaller/bot-pool/status';
      // Clean up double slashes if any, just in case
      url = url.replaceAll(RegExp(r'(?<!:)//'), '/');
      
      debugPrint('[BotPool] URL: $url');
      final response = await _apiService.client.get('/api/telecaller/bot-pool/status');
      
      debugPrint('[BotPool] statusCode: ${response.statusCode}');
      debugPrint('[BotPool] rawBody: ${response.data}');

      final json = response.data;
      final data = json['data'] ?? json;

      final int availableCount = data['available_count'] ??
          data['availableCount'] ??
          data['pool_count'] ??
          data['poolCount'] ??
          data['lead_count'] ??
          data['leadCount'] ??
          data['count'] ??
          0;
          
      debugPrint('[BotPool] parsed availableCount: $availableCount');

      return {
        'success': true, 
        'data': {
          'availableLeads': availableCount,
          'queueNumber': data['queue_position'] ?? data['queuePosition'],
          'assignedLead': data['latest_assigned_lead'] ?? data['assignedLead'],
          'blockingReason': data['message'] ?? data['blockingReason'],
        }
      };
    } on DioException catch (e) {
      debugPrint('[BotPool] DioException: ${e.response?.data}');
      return {
        'success': false, 
        'message': e.response?.data?['message'] ?? 'Failed to fetch Bot Pool status'
      };
    } catch (e) {
      debugPrint('[BotPool] Exception: $e');
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }

  Future<Map<String, dynamic>> fetchLead() async {
    try {
      final response = await _apiService.client.post('/api/telecaller/bot-pool/fetch');
      final json = response.data;
      final data = json['data'] ?? json;
      return {
        'success': true, 
        'data': {
           ...data,
           'queuePosition': data['queue_position'] ?? data['queuePosition'],
        }
      };
    } on DioException catch (e) {
      return {
        'success': false, 
        'message': e.response?.data?['message'] ?? 'Failed to fetch lead'
      };
    } catch (e) {
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }

  Future<Map<String, dynamic>> updateStatus1(int leadId, String status1, String remark) async {
    try {
      final response = await _apiService.client.post('/api/telecaller/bot-pool/status1', data: {
        'lead_id': leadId,
        'status1': status1,
        'remark': remark,
      });
      return {'success': true, 'data': response.data};
    } on DioException catch (e) {
      return {
        'success': false, 
        'message': e.response?.data?['message'] ?? 'Failed to update Status 1'
      };
    } catch (e) {
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }
}
