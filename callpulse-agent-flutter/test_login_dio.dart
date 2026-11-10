import 'package:dio/dio.dart';

void main() async {
  final dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  String finalUrl = 'http://localhost:5056';
  dio.options.baseUrl = finalUrl;

  try {
    final response = await dio.post('/api/auth/telecaller-login', data: {
      'username': '9876543210',
      'password': '123',
    });
    print('SUCCESS: ${response.statusCode}');
  } on DioException catch (e) {
    print('ERROR: ${e.response?.statusCode}');
    print('URL that was actually called: ${e.requestOptions.uri}');
  }
}
