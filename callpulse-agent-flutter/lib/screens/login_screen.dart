import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/auto_sync_service.dart';
import '../theme/app_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/neon_button.dart';
import '../widgets/premium_widgets.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _mobileController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final AuthService _authService = AuthService();

  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _mobileController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final mobile = _mobileController.text.trim();
    final password = _passwordController.text;

    if (mobile.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter both mobile number and password');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.login(mobile, password);
    if (!mounted) return;

    if (result['success'] == true) {
      await AutoSyncService().init();
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = result['message'] ?? 'Login failed';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      body: AppBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 32),

                  // Logo
                  Container(
                    height: 90,
                    width: 90,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 32, spreadRadius: 0),
                      ],
                    ),
                    child: const Icon(Icons.phone_in_talk_rounded, size: 44, color: Colors.white),
                  ),
                  const SizedBox(height: 28),

                  // Title
                  const Text(
                    'CK_calluplse',
                    style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -1),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Agent CRM Portal',
                    style: TextStyle(fontSize: 15, color: AppColors.textMuted, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 48),

                  // Login card
                  GlassCard(
                    borderRadius: 28,
                    glowColor: AppColors.primary,
                    child: Column(
                      children: [
                        GlassTextField(
                          controller: _mobileController,
                          labelText: 'Telecaller Mobile',
                          hintText: 'e.g. 9876543210',
                          prefixIcon: Icons.phone_android_rounded,
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                        ),
                        const SizedBox(height: 16),
                        GlassTextField(
                          controller: _passwordController,
                          labelText: 'Password',
                          prefixIcon: Icons.lock_outline_rounded,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _isLoading ? null : _handleLogin(),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                              color: AppColors.textMuted,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),

                        // Error
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.glowRed,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.error.withOpacity(0.4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                                const SizedBox(width: 10),
                                Expanded(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error, fontSize: 13, height: 1.4))),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),
                        NeonButton(
                          label: 'LOGIN TO PORTAL',
                          onPressed: _isLoading ? null : _handleLogin,
                          isLoading: _isLoading,
                          icon: Icons.login_rounded,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text('s.v.4', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
