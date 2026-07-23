import 'package:dio/dio.dart';

void main() {
  final dio = Dio(BaseOptions(baseUrl: 'http://localhost:5056'));
  print(dio.options.baseUrl);
  var uri = Uri.parse('http://localhost:5056');
  var pathUri = Uri.parse('/api/callpulse/my-lead-numbers');
  print(uri.resolveUri(pathUri).toString());
}
