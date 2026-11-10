import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../core/constants.dart';
import '../services/auth_service.dart';
import '../services/auto_sync_service.dart';
import '../theme/app_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/premium_widgets.dart';
import 'bot_pool_screen.dart';
import 'free_leads_screen.dart';
import 'direct_leads_screen.dart';
import 'transferred_leads_screen.dart';
import 'login_screen.dart';
import 'call_logs_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  final AuthService _authService = AuthService();
  final AutoSyncService _autoSyncService = AutoSyncService();

  Map<String, dynamic>? _currentUser;
  String _syncStatus = 'Active';
  String _syncError = '';
  int _todayMatchedCount = 0;
  String _lastSyncTimeStr = 'Never';
  bool _isManualSyncing = false;
  String? _syncFeedbackMsg;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final user = await _authService.getCurrentUser();
    final prefs = await SharedPreferences.getInstance();
    final status = prefs.getString(Constants.lastSyncStatusKey) ?? 'Active';
    final err = prefs.getString(Constants.lastSyncErrorKey) ?? '';
    final count = prefs.getInt(Constants.todayMatchedCallsCountKey) ?? 0;
    final lastTs = prefs.getInt(Constants.lastSyncKey) ?? 0;

    String timeStr = 'Never';
    if (lastTs > 0) {
      final dt = DateTime.fromMillisecondsSinceEpoch(lastTs);
      timeStr = DateFormat('hh:mm a, dd MMM').format(dt);
    }

    if (!mounted) return;
    setState(() {
      _currentUser = user;
      _syncStatus = status;
      _syncError = err;
      _todayMatchedCount = count;
      _lastSyncTimeStr = timeStr;
    });
  }

  Future<void> _handleManualSync() async {
    setState(() {
      _isManualSyncing = true;
      _syncFeedbackMsg = null;
    });

    final result = await _autoSyncService.triggerSync(onProgress: (msg) {
      if (mounted) setState(() => _syncFeedbackMsg = msg);
    });

    await _loadData();
    if (!mounted) return;
    
    setState(() {
      _isManualSyncing = false;
      _syncFeedbackMsg = 'Manual sync completed!';
    });

    if (result != null) {
      _showSyncStatsDialog(result);
    }
  }

  void _showSyncStatsDialog(Map<String, dynamic> stats) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Sync Summary', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _statRow('Total Logs Fetched', '${stats['fetchedCallLogs'] ?? 0}', Colors.blueAccent),
              const Divider(color: AppColors.borderSubtle),
              _statRow('Total CRM Saved', '${(stats['uploadedBotCalls'] ?? 0) + (stats['uploadedDirectCalls'] ?? 0) + (stats['uploadedFreeCalls'] ?? 0) + (stats['uploadedTransferredCalls'] ?? 0)}', AppColors.success),
              _statRow('Duplicate / Skipped', '${stats['skippedDuplicates'] ?? 0}', Colors.orange),
              _statRow('Failed Logs', '${stats['failedUploads'] ?? 0}', AppColors.error),
              const Divider(color: AppColors.borderSubtle),
              const Text('Breakdown by Lead Type:', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              _statRow('  • Bot Leads', '${stats['uploadedBotCalls'] ?? 0}', AppColors.textMuted),
              _statRow('  • Direct Leads', '${stats['uploadedDirectCalls'] ?? 0}', AppColors.textMuted),
              _statRow('  • Free Leads', '${stats['uploadedFreeCalls'] ?? 0}', AppColors.textMuted),
              _statRow('  • Transferred', '${stats['uploadedTransferredCalls'] ?? 0}', AppColors.textMuted),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: AppColors.primaryLight)),
          ),
        ],
      ),
    );
  }

  Widget _statRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Future<void> _handleLogout() async {
    await _autoSyncService.stop();
    await _authService.logout();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  String get _appBarTitle {
    switch (_currentIndex) {
      case 1: return 'Bot Pool';
      case 2: return 'Free Leads';
      case 3: return 'Direct Leads';
      case 4: return 'Transferred Leads';
      case 5: return 'Call Logs';
      case 6: return 'Settings';
      default: return 'Dashboard';
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      _buildHomeTab(),
      const BotPoolScreen(),
      const FreeLeadsScreen(),
      const DirectLeadsScreen(),
      const TransferredLeadsScreen(),
      const CallLogsScreen(),
      _buildSettingsTab(),
    ];

    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      extendBody: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(_appBarTitle, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontSize: 18, letterSpacing: 0.2)),
        actions: [
          if (_currentIndex == 0)
            Container(
              margin: const EdgeInsets.only(right: 8),
              child: IconButton(
                icon: _isManualSyncing
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: AppColors.primaryLight, strokeWidth: 2.5))
                    : const Icon(Icons.sync_rounded, color: AppColors.primaryLight),
                tooltip: 'Manual Sync Now',
                onPressed: _isManualSyncing ? null : _handleManualSync,
              ),
            ),
        ],
      ),
      body: AppBackground(child: pages[_currentIndex]),
      bottomNavigationBar: GlassBottomNav(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() => _currentIndex = index);
          if (index == 0) _loadData();
        },
      ),
    );
  }

  Widget _buildHomeTab() {
    final syncOk = _syncStatus == 'Active';
    final syncError = _syncStatus == 'Error' || _syncStatus == 'Permission Missing';
    final syncColor = syncOk ? AppColors.success : syncError ? AppColors.error : AppColors.warning;
    final syncIcon = syncOk ? Icons.check_circle_rounded : syncError ? Icons.error_rounded : Icons.pause_circle_rounded;

    final userName = _currentUser?['name'] ?? _currentUser?['mobile'] ?? 'Telecaller';

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.primaryLight,
      backgroundColor: AppColors.bgCard,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        children: [
          // Welcome card
          GlassCard(
            glowColor: AppColors.primary,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0x22A855F7), Color(0x114F46E5)],
            ),
            child: Row(
              children: [
                Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 16)],
                  ),
                  child: const Icon(Icons.person_rounded, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Welcome back,', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(userName, style: const TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: syncColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: syncColor.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(syncIcon, size: 12, color: syncColor),
                      const SizedBox(width: 5),
                      Text(_syncStatus, style: TextStyle(color: syncColor, fontSize: 11, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stats grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 1.3,
            children: [
              StatCard(
                label: 'Calls Today',
                value: '$_todayMatchedCount',
                icon: Icons.call_rounded,
                color: AppColors.success,
                subtitle: 'Auto synced',
              ),
              StatCard(
                label: 'Last Sync',
                value: _lastSyncTimeStr == 'Never' ? '—' : _lastSyncTimeStr.split(',')[0],
                icon: Icons.sync_rounded,
                color: AppColors.primaryLight,
                subtitle: _lastSyncTimeStr == 'Never' ? 'Not synced yet' : _lastSyncTimeStr,
              ),
              StatCard(
                label: 'Sync Status',
                value: _syncStatus,
                icon: syncIcon,
                color: syncColor,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Manual sync feedback
          if (_syncFeedbackMsg != null)
            GlassCard(
              borderRadius: 16,
              padding: const EdgeInsets.all(14),
              borderColor: AppColors.success.withOpacity(0.3),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_syncFeedbackMsg!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13))),
                ],
              ),
            ),

          if (_syncError.isNotEmpty) ...[
            const SizedBox(height: 14),
            GlassCard(
              borderRadius: 16,
              padding: const EdgeInsets.all(14),
              borderColor: AppColors.error.withOpacity(0.3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_syncError, style: const TextStyle(color: AppColors.warning, fontSize: 13, height: 1.4))),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Battery tip
          GlassCard(
            borderRadius: 18,
            padding: const EdgeInsets.all(16),
            borderColor: AppColors.warning.withOpacity(0.2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.battery_alert_rounded, color: AppColors.warning, size: 18),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Battery Optimization Tip', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 13)),
                      SizedBox(height: 4),
                      Text(
                        'Go to Phone Settings → Apps → CallPulse Agent → Battery → Set to "Unrestricted" to keep call sync active in background.',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
      children: [
        const SizedBox(height: 12),
        const Text('SYNC', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
        const SizedBox(height: 12),

        GlassCard(
          borderRadius: 18,
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: SwitchListTile(
                  activeColor: AppColors.primaryLight,
                  title: const Text('Auto Sync Background Service', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: const Text('Sync call logs every minute & on call ended', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  value: _syncStatus != 'Paused',
                  onChanged: (val) async {
                    if (val) {
                      await _autoSyncService.checkAndStart();
                    } else {
                      await _autoSyncService.stop();
                    }
                    _loadData();
                  },
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 28),
        const Text('ACCOUNT', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
        const SizedBox(height: 12),

        GlassCard(
          borderRadius: 18,
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _settingsTile(
                icon: Icons.logout_rounded,
                iconColor: AppColors.error,
                title: 'Logout from Portal',
                subtitle: 'Clears session token',
                titleColor: AppColors.error,
                onTap: _handleLogout,
              ),
            ],
          ),
        ),

        const SizedBox(height: 32),
        const Center(
          child: Text(
            'c.v.3',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _settingsTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    Widget? trailing,
    Color? titleColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: iconColor.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: titleColor ?? AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 3),
                  Text(subtitle, style: const TextStyle(color: AppColors.textMuted, fontSize: 12), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }
}
