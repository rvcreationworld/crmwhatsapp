import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/status_badge.dart';
import '../widgets/premium_widgets.dart';

class CallLogsScreen extends StatefulWidget {
  const CallLogsScreen({super.key});

  @override
  State<CallLogsScreen> createState() => _CallLogsScreenState();
}

class _CallLogsScreenState extends State<CallLogsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _logs = [];
  String _filterType = 'All'; // All, OUTGOING, INCOMING, MISSED

  @override
  void initState() {
    super.initState();
    _fetchRecentLogs();
  }

  Future<void> _fetchRecentLogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiService.client.get('/api/callpulse/recent');
      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> logsList = [];
        if (data is List) {
          logsList = data;
        } else if (data is Map && data['data'] is List) {
          logsList = data['data'];
        } else if (data is Map && data['logs'] is List) {
          logsList = data['logs'];
        }
        setState(() {
          _logs = logsList;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load logs: ${response.statusCode}';
        });
      }
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.response?.data?['message'] ?? 'Network error fetching logs';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'Unknown error occurred';
      });
    }
  }

  String _formatDuration(int seconds) {
    if (seconds <= 0) return '0s';
    final int min = seconds ~/ 60;
    final int sec = seconds % 60;
    return min > 0 ? '${min}m ${sec}s' : '${sec}s';
  }

  List<dynamic> get _filteredLogs {
    if (_filterType == 'All') return _logs;
    return _logs.where((l) {
      final ct = (l['call_type'] ?? '').toString().toUpperCase();
      return ct.contains(_filterType);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primaryLight, strokeWidth: 2.5));
    }

    if (_errorMessage != null) {
      return ErrorState(message: _errorMessage!, onRetry: _fetchRecentLogs);
    }

    final filtered = _filteredLogs;

    return RefreshIndicator(
      onRefresh: _fetchRecentLogs,
      color: AppColors.primaryLight,
      backgroundColor: AppColors.bgCard,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: ['All', 'OUTGOING', 'INCOMING', 'MISSED'].map((type) {
                final selected = _filterType == type;
                return Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: GestureDetector(
                    onTap: () => setState(() => _filterType = type),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        gradient: selected ? AppColors.primaryGradient : null,
                        color: selected ? null : AppColors.bgGlass,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected ? AppColors.primary : AppColors.borderSubtle,
                          width: selected ? 0 : 1,
                        ),
                        boxShadow: selected
                            ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))]
                            : null,
                      ),
                      child: Text(
                        type,
                        style: TextStyle(
                          color: selected ? Colors.white : AppColors.textMuted,
                          fontSize: 12,
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 16),

          if (filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 60),
              child: EmptyState(
                icon: Icons.history_toggle_off_rounded,
                message: _filterType == 'All' ? 'No Synced Call Logs Yet' : 'No ${_filterType.capitalize()} Calls',
                subtitle: _filterType == 'All'
                    ? 'When you make or receive calls with CRM numbers, they will auto-sync here.'
                    : 'No calls of this type found.',
              ),
            )
          else
            ...filtered.asMap().entries.map((entry) {
              final log = entry.value;
              final String leadType = log['lead_type'] ?? 'CRM';
              final String number = log['dialed_number'] ?? (log['normalized_number'] ?? 'Unknown');
              final String callType = log['call_type'] ?? 'UNKNOWN';
              final int duration = int.tryParse(log['duration_seconds']?.toString() ?? '0') ?? 0;

              String dateStr = 'Unknown date';
              if (log['call_started_at'] != null) {
                try {
                  final dt = DateTime.parse(log['call_started_at']).toLocal();
                  dateStr = DateFormat('MMM dd, hh:mm a').format(dt);
                } catch (_) {}
              }

              final callTypeUpper = callType.toUpperCase();
              StatusBadge typeBadge;
              Color callColor;
              IconData callIcon;

              if (callTypeUpper.contains('INCOMING')) {
                typeBadge = StatusBadge.incoming();
                callColor = AppColors.info;
                callIcon = Icons.call_received_rounded;
              } else if (callTypeUpper.contains('MISSED')) {
                typeBadge = StatusBadge.missed();
                callColor = AppColors.error;
                callIcon = Icons.call_missed_rounded;
              } else if (callTypeUpper.contains('REJECTED')) {
                typeBadge = StatusBadge.rejected();
                callColor = AppColors.error;
                callIcon = Icons.call_end_rounded;
              } else {
                typeBadge = StatusBadge.outgoing();
                callColor = AppColors.success;
                callIcon = Icons.call_made_rounded;
              }

              final leadBadge = leadType == 'DIRECT'
                  ? StatusBadge.directLead()
                  : leadType == 'FREE'
                      ? StatusBadge.freeLead()
                      : StatusBadge.botLead();

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  borderRadius: 18,
                  padding: const EdgeInsets.all(16),
                  borderColor: callColor.withOpacity(0.2),
                  child: Row(children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: callColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: callColor.withOpacity(0.3)),
                      ),
                      child: Icon(callIcon, color: callColor, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(number, style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        Row(children: [
                          typeBadge,
                          const SizedBox(width: 8),
                          leadBadge,
                        ]),
                        const SizedBox(height: 8),
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text(dateStr, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                          Text(_formatDuration(duration), style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                      ]),
                    ),
                  ]),
                ),
              );
            }),
        ],
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() => isEmpty ? this : '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
}
