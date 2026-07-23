import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants.dart';
import '../main.dart';
import '../screens/login_screen.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: Constants.apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ));
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _secureStorage.read(key: Constants.secureTokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        print('API Error [${e.requestOptions.method} ${e.requestOptions.path}]: ${e.message}');
        
        if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
          await _secureStorage.delete(key: Constants.secureTokenKey);
          await _secureStorage.delete(key: Constants.secureUserKey);
          
          if (navigatorKey.currentContext != null) {
            Navigator.of(navigatorKey.currentContext!).pushAndRemoveUntil(
              MaterialPageRoute(builder: (context) => const LoginScreen()),
              (route) => false,
            );
          }
        }
        
        return handler.next(e);
      }
    ));
  }

  void updateBaseUrl(String url) {
    // No longer needed
  }

  Dio get client => _dio;
}
