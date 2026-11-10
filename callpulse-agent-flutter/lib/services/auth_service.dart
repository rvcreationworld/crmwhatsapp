import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import '../core/constants.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(String mobile, String password) async {
    try {
      print('--- LOGIN ATTEMPT ---');
      print('API Base URL: ${Constants.apiBaseUrl}');
      print('Payload: {"username": "$mobile", "password": "***"}');

      // Use telecaller-login endpoint which authenticates tele_mobile + password_hash
      final response = await _apiService.client.post('/api/auth/telecaller-login', data: {
        'username': mobile,
        'password': password,
      });

      print('Status Code: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['role'] != 'TELECALLER') {
          return {'success': false, 'message': 'Only telecallers can use this app'};
        }

        // Save securely in FlutterSecureStorage
        await _secureStorage.write(key: Constants.secureTokenKey, value: data['token']);
        await _secureStorage.write(key: Constants.secureUserKey, value: jsonEncode(data['user']));

        await _registerDevice();
        return {'success': true, 'user': data['user']};
      }
      return {'success': false, 'message': 'Login failed: ${response.statusCode}'};
    } on DioException catch (e) {
      print('DioException Type: ${e.type}');
      print('DioException Message: ${e.message}');
      print('DioException Response: ${e.response?.data}');
      
      String errorMessage = 'Login failed';
      
      if (e.type == DioExceptionType.connectionTimeout || 
          e.type == DioExceptionType.receiveTimeout || 
          e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.unknown) {
        errorMessage = 'Server not reachable. Please check API Base URL or WiFi.';
      } else if (e.response != null) {
        if (e.response?.statusCode == 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (e.response?.statusCode == 404) {
          errorMessage = 'Server route not found. Please check API Base URL.';
        } else if (e.response?.statusCode == 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (e.response?.statusCode == 400 || e.response?.statusCode == 403) {
          errorMessage = 'Invalid mobile number or password.';
        } else {
          errorMessage = e.response?.data['message'] ?? 'Invalid mobile number or password.';
        }
      } else {
        errorMessage = 'Server not reachable. Please check internet.';
      }

      return {'success': false, 'message': errorMessage};
    } catch (e) {
      print('Unknown Error: $e');
      return {'success': false, 'message': 'Server error. Please try again later.'};
    }
  }

  Future<void> _registerDevice() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      String deviceId = 'unknown';
      String deviceName = 'unknown';

      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
        deviceName = '${androidInfo.brand} ${androidInfo.model}';
      }

      await _apiService.client.post('/api/callpulse/agent/register', data: {
        'device_id': deviceId,
        'device_name': deviceName,
        'app_version': '1.0.0',
        'api_base_url': Constants.apiBaseUrl,
      });
    } catch (e) {
      print('Register device failed: $e');
    }
  }

  Future<void> logout() async {
    await _secureStorage.delete(key: Constants.secureTokenKey);
    await _secureStorage.delete(key: Constants.secureUserKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await _secureStorage.read(key: Constants.secureTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, dynamic>?> getCurrentUser() async {
    final userStr = await _secureStorage.read(key: Constants.secureUserKey);
    if (userStr != null && userStr.isNotEmpty) {
      return jsonDecode(userStr);
    }
    return null;
  }
}
