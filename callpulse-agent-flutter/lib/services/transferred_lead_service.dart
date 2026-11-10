import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class TransferredLeadService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> getTransferredLeads({String period = 'current'}) async {
    try {
      final String baseUrl = _apiService.client.options.baseUrl;
      String url = '$baseUrl/api/telecaller/transferred-leads?period=$period';
      url = url.replaceAll(RegExp(r'(?<!:)//'), '/');
      
      debugPrint('[TransferredLeads] URL: $url');
      final response = await _apiService.client.get('/api/telecaller/transferred-leads', queryParameters: {'period': period});
      
      debugPrint('[TransferredLeads] statusCode: ${response.statusCode}');

      final json = response.data;
      final data = json['data'] ?? json;
      List<dynamic> leadsJson = [];
      
      if (json is List) {
        leadsJson = json;
      } else if (data is List) {
        leadsJson = data;
      } else if (data is Map && data['leads'] != null) {
        leadsJson = data['leads'];
      }
      
      debugPrint('[TransferredLeads] parsed leads count: ${leadsJson.length}');

      return {'success': true, 'data': {'leads': leadsJson}};
    } on DioException catch (e) {
      debugPrint('[TransferredLeads] DioException: ${e.response?.data}');
      final respData = e.response?.data;
      String msg = respData?['message'] ?? 'Failed to fetch transferred leads';
      if (respData?['error'] != null) {
        msg += ': ${respData!['error']}';
      }
      return {'success': false, 'message': msg};
    } catch (e) {
      debugPrint('[TransferredLead] Exception: $e');
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }

  Future<Map<String, dynamic>> updateTransferredLeadStatus4(int leadId, String status4, String remark) async {
    try {
      final response = await _apiService.client.post('/api/telecaller/transferred-leads/$leadId/status4', data: {
        'status4': status4,
        'status4_remark': remark,
      });
      return {'success': true, 'data': response.data};
    } on DioException catch (e) {
      debugPrint('[TransferredLead] DioException: ${e.response?.data}');
      return {
        'success': false, 
        'message': e.response?.data?['message'] ?? 'Failed to update Status 4'
      };
    } catch (e) {
      debugPrint('[TransferredLead] Exception: $e');
      return {'success': false, 'message': 'Unknown error occurred'};
    }
  }
}
