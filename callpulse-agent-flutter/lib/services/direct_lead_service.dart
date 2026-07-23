import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class DirectLeadService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> getFreshDirectLeads() async {
    try {
      final String baseUrl = _apiService.client.options.baseUrl;
      String url = '$baseUrl/api/telecaller/direct-leads/fresh';
      url = url.replaceAll(RegExp(r'(?<!:)//'), '/');
      
      debugPrint('[DirectLeads] URL: $url');
      final response = await _apiService.client.get('/api/telecaller/direct-leads/fresh');
      
      debugPrint('[DirectLeads] statusCode: ${response.statusCode}');
      debugPrint('[DirectLeads] rawBody: ${response.data}');

      final json = response.data;
      final data = json['data'] ?? json;
      List<dynamic> leadsJson = data['leads'] ?? [];
      
      if (json is List) {
        leadsJson = json;
      }
      
      debugPrint('[DirectLeads] parsed leads count: ${leadsJson.length}');

      return {'success': true, 'data': {'leads': leadsJson}};
    } on DioException catch (e) {
      debugPrint('[DirectLeads] DioException: ${e.response?.data}');
      final respData = e.response?.data;
      String msg = respData?['message'] ?? 'Failed to fetch direct leads';
      if (respData?['error'] != null) {
        msg += ': ${respData!['error']}';
      }
      return {'success': false, 'message': msg};
    } catch (e) {
      debugPrint('[DirectLead] Exception: $e');
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }

  Future<Map<String, dynamic>> updateDirectLeadStatus1(int leadId, String status1, String remark) async {
    try {
      final response = await _apiService.client.post('/api/telecaller/direct-leads/$leadId/status1', data: {
        'status1': status1,
        'status1_remark': remark,
      });
      return {'success': true, 'data': response.data};
    } on DioException catch (e) {
      debugPrint('[DirectLead] DioException: ${e.response?.data}');
      return {
        'success': false, 
        'message': e.response?.data?['message'] ?? 'Failed to update Status 1'
      };
    } catch (e) {
      debugPrint('[DirectLead] Exception: $e');
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }
}
