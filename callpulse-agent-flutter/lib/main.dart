import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/constants.dart';
import 'services/auth_service.dart';
import 'services/auto_sync_service.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final authService = AuthService();
  final bool loggedIn = await authService.isLoggedIn();

  if (loggedIn) {
    await AutoSyncService().init();
  }

  Widget initialScreen;
  if (!loggedIn) {
    initialScreen = const LoginScreen();
  } else {
    initialScreen = const DashboardScreen();
  }

  runApp(CallPulseApp(initialScreen: initialScreen));
}

class CallPulseApp extends StatelessWidget {
  final Widget initialScreen;

  const CallPulseApp({super.key, required this.initialScreen});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CK_calluplse',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: initialScreen,
    );
  }
}
