import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/bot_pool_service.dart';
import '../theme/app_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/neon_button.dart';
import '../widgets/status_badge.dart';
import '../widgets/premium_widgets.dart';

class BotPoolScreen extends StatefulWidget {
  const BotPoolScreen({super.key});

  @override
  State<BotPoolScreen> createState() => _BotPoolScreenState();
}

class _BotPoolScreenState extends State<BotPoolScreen> {
  final BotPoolService _botPoolService = BotPoolService();
  final TextEditingController _remarkController = TextEditingController();

  bool _isLoading = true;
  bool _isFetching = false;
  bool _isSaving = false;
  String? _errorMessage;
  String? _successMessage;

  Map<String, dynamic>? _poolStatus;
  String? _selectedStatus1;

  final List<String> _status1Options = [
    'Ringing', 'Call Back', 'Info Given', 'Not Conn',
    'Wrong No', 'Int Angel', 'Think&LMK', 'Not Int', 'RdyKYC',
  ];

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  @override
  void dispose() {
    _remarkController.dispose();
    super.dispose();
  }

  Future<void> _loadStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await _botPoolService.getStatus();
    if (!mounted) return;

    if (res['success'] == true) {
      setState(() {
        _poolStatus = res['data'];
        _isLoading = false;
        if (_poolStatus?['assignedLead'] != null) {
          final currentSt1 = _poolStatus!['assignedLead']['status1'];
          _selectedStatus1 = (currentSt1 != null && _status1Options.contains(currentSt1)) ? currentSt1 : null;
          _remarkController.text = _poolStatus!['assignedLead']['remark'] ?? '';
        }
      });
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = res['message'] ?? 'Failed to load Bot Pool status';
      });
    }
  }

  Future<void> _handleFetchLead() async {
    setState(() {
      _isFetching = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final res = await _botPoolService.fetchLead();
    if (!mounted) return;
    setState(() => _isFetching = false);

    if (res['success'] == true) {
      final data = res['data'] ?? {};
      final queuePos = data['queuePosition'] ?? data['queue_position'];
      if (queuePos != null) {
        setState(() => _successMessage = 'Added to queue! Position: #$queuePos');
      } else {
        setState(() => _successMessage = 'Lead fetched successfully!');
      }
      await _loadStatus();
    } else {
      setState(() => _errorMessage = res['message'] ?? 'Could not fetch lead');
    }
  }

  Future<void> _handleUpdateStatus1() async {
    final assigned = _poolStatus?['assignedLead'];
    if (assigned == null) return;

    if (_selectedStatus1 == null) {
      PremiumSnackbar.show(context, 'Please select a status first.', isError: true);
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final res = await _botPoolService.updateStatus1(assigned['id'], _selectedStatus1 ?? '', _remarkController.text.trim());
    if (!mounted) return;
    setState(() => _isSaving = false);

    if (res['success'] == true) {
      PremiumSnackbar.show(context, 'Status 1 updated! Lead moved to Current Leads.', isSuccess: true);
      _remarkController.clear();
      _selectedStatus1 = null;
      await _loadStatus();
    } else {
      setState(() => _errorMessage = res['message'] ?? 'Failed to update Status 1');
    }
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty) { PremiumSnackbar.show(context, 'Invalid phone number', isError: true); return; }
    final cleaned = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleaned.isEmpty) { PremiumSnackbar.show(context, 'Invalid phone number', isError: true); return; }
    final uri = Uri(scheme: 'tel', path: cleaned);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) PremiumSnackbar.show(context, 'Could not open dialer', isError: true);
    } catch (e) {
      if (mounted) PremiumSnackbar.show(context, 'Error: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primaryLight, strokeWidth: 2.5));
    }

    final availableCount = _poolStatus?['availableLeads'] ?? 0;
    final queueNumber = _poolStatus?['queueNumber'];
    final assignedLead = _poolStatus?['assignedLead'];
    final blockingReason = _poolStatus?['blockingReason'];

    final bool isKycDone = assignedLead?['is_kyc_done'] == 1 || assignedLead?['is_kyc_done'] == true || assignedLead?['status1'] == 'KYC Done';
    final bool isUnderUs = assignedLead?['status_lock_type'] == 'UNDER_US' || assignedLead?['status1'] == 'Under Us';
    final bool isMidnightLocked = assignedLead?['is_locked'] == true || assignedLead?['status1_locked'] == true;
    final bool isLocked = isKycDone || isUnderUs || isMidnightLocked;

    return RefreshIndicator(
      onRefresh: _loadStatus,
      color: AppColors.primaryLight,
      backgroundColor: AppColors.bgCard,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        children: [
          // Pool status card
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
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.4), blurRadius: 16)],
                  ),
                  child: const Icon(Icons.smart_toy_rounded, size: 28, color: Colors.white),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Bot Pool Available', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.5)),
                      const SizedBox(height: 4),
                      Text('$availableCount Leads', style: const TextStyle(color: AppColors.textPrimary, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                      if (queueNumber != null) ...[
                        const SizedBox(height: 6),
                        StatusBadge.inQueue(queueNumber),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.textMuted),
                  onPressed: _loadStatus,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Messages
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: GlassCard(
                borderRadius: 16,
                padding: const EdgeInsets.all(14),
                borderColor: AppColors.error.withOpacity(0.3),
                child: Row(children: [
                  const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error, fontSize: 13))),
                ]),
              ),
            ),

          if (_successMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: GlassCard(
                borderRadius: 16,
                padding: const EdgeInsets.all(14),
                borderColor: AppColors.success.withOpacity(0.3),
                child: Row(children: [
                  const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 20),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_successMessage!, style: const TextStyle(color: AppColors.success, fontSize: 13))),
                ]),
              ),
            ),

          // Blocking reason / Fetch button
          if (blockingReason != null && assignedLead == null) ...[
            GlassCard(
              borderRadius: 18,
              padding: const EdgeInsets.all(18),
              borderColor: AppColors.warning.withOpacity(0.3),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 24),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Fetch Blocked', style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(blockingReason, style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4)),
                ])),
              ]),
            ),
          ] else if (assignedLead == null) ...[
            NeonButton(
              label: _isFetching
                  ? 'FETCHING...'
                  : (availableCount == 0 && queueNumber != null)
                      ? 'ALREADY IN QUEUE (#$queueNumber)'
                      : (availableCount == 0 ? 'JOIN QUEUE' : 'FETCH NEW LEAD'),
              onPressed: (_isFetching || (availableCount == 0 && queueNumber != null)) ? null : _handleFetchLead,
              isLoading: _isFetching,
              icon: Icons.download_rounded,
            ),
          ] else ...[
            // Assigned lead card
            GlassCard(
              glowColor: isLocked ? AppColors.warning : AppColors.primary,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge.botLead(),
                      if (isLocked) StatusBadge.locked(isKycDone ? 'KYC Done' : isUnderUs ? 'Under Us' : 'Midnight Lock'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(assignedLead['lead_name'] ?? 'Unknown', style: const TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.phone_rounded, size: 15, color: AppColors.textMuted),
                    const SizedBox(width: 8),
                    Text(assignedLead['lead_contact'] ?? '', style: const TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                  ]),
                  const SizedBox(height: 20),

                  // Call button
                  NeonButton(
                    label: 'CALL',
                    icon: Icons.call_rounded,
                    gradient: AppColors.successGradient,
                    glowColor: AppColors.success,
                    onPressed: () => _makePhoneCall(assignedLead['lead_contact'] ?? ''),
                    height: 50,
                  ),
                  const SizedBox(height: 24),

                  const Divider(color: AppColors.borderSubtle, height: 1),
                  const SizedBox(height: 20),

                  const Text('Update Status 1', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 14),

                  GlassDropdown(
                    value: _selectedStatus1,
                    hint: 'Select Status',
                    items: _status1Options,
                    label: 'Status 1',
                    enabled: !isLocked,
                    onChanged: (val) { if (val != null) setState(() => _selectedStatus1 = val); },
                  ),
                  const SizedBox(height: 14),

                  GlassTextField(
                    controller: _remarkController,
                    labelText: 'Remark / Call Notes',
                    hintText: 'Add important notes...',
                    maxLines: 2,
                    enabled: !isLocked,
                  ),
                  const SizedBox(height: 20),

                  NeonButton(
                    label: 'SUBMIT STATUS 1',
                    icon: Icons.cloud_upload_rounded,
                    onPressed: isLocked ? null : (_isSaving ? null : _handleUpdateStatus1),
                    isLoading: _isSaving,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
