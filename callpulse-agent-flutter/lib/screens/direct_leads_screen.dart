import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/direct_lead_service.dart';
import '../theme/app_colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/neon_button.dart';
import '../widgets/status_badge.dart';
import '../widgets/premium_widgets.dart';

class DirectLeadsScreen extends StatefulWidget {
  const DirectLeadsScreen({super.key});

  @override
  State<DirectLeadsScreen> createState() => _DirectLeadsScreenState();
}

class _DirectLeadsScreenState extends State<DirectLeadsScreen> {
  final DirectLeadService _directLeadService = DirectLeadService();

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _leads = [];
  final Map<int, String?> _selectedStatusMap = {};
  final Map<int, TextEditingController> _remarkControllers = {};
  final Map<int, bool> _isSavingMap = {};

  final List<String> _status1Options = [
    'Ringing', 'Call Back', 'Info Given', 'Not Conn',
    'Wrong No', 'Int Angel', 'Think&LMK', 'Not Int', 'RdyKYC',
  ];

  @override
  void initState() {
    super.initState();
    _loadDirectLeads();
  }

  @override
  void dispose() {
    for (final c in _remarkControllers.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> _loadDirectLeads() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await _directLeadService.getFreshDirectLeads();
    if (!mounted) return;

    if (res['success'] == true) {
      final List<dynamic> fetched = res['data']['leads'] ?? [];
      for (final lead in fetched) {
        final int id = lead['id'];
        _selectedStatusMap.putIfAbsent(id, () => null);
        _remarkControllers.putIfAbsent(id, () => TextEditingController());
        _isSavingMap.putIfAbsent(id, () => false);
      }
      setState(() {
        _leads = fetched;
        _isLoading = false;
      });
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = res['message'] ?? 'Failed to load Direct Leads';
      });
    }
  }

  Future<void> _handleUpdateStatus1(int leadId) async {
    final status1 = _selectedStatusMap[leadId];
    if (status1 == null) {
      PremiumSnackbar.show(context, 'Please select a status first.', isError: true);
      return;
    }

    final remark = _remarkControllers[leadId]?.text.trim() ?? '';
    setState(() => _isSavingMap[leadId] = true);

    final res = await _directLeadService.updateDirectLeadStatus1(leadId, status1, remark);
    if (!mounted) return;
    setState(() => _isSavingMap[leadId] = false);

    if (res['success'] == true) {
      PremiumSnackbar.show(context, 'Status 1 updated. Lead moved to Current Leads.', isSuccess: true);
      setState(() => _leads.removeWhere((l) => l['id'] == leadId));
    } else {
      PremiumSnackbar.show(context, res['message'] ?? 'Failed to update Status 1', isError: true);
      setState(() => _errorMessage = res['message']);
    }
  }

  Future<void> _makePhoneCall(String phone) async {
    if (phone.isEmpty) { PremiumSnackbar.show(context, 'Invalid phone number', isError: true); return; }
    final cleaned = phone.replaceAll(RegExp(r'[^0-9+]'), '');
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

    if (_errorMessage != null) {
      return ErrorState(message: _errorMessage!, onRetry: _loadDirectLeads);
    }

    return RefreshIndicator(
      onRefresh: _loadDirectLeads,
      color: AppColors.primaryLight,
      backgroundColor: AppColors.bgCard,
      child: _leads.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                const EmptyState(
                  icon: Icons.inbox_rounded,
                  message: 'No Fresh Direct Leads',
                  subtitle: 'All your direct leads have been worked or there are none assigned.',
                ),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
              itemCount: _leads.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  // Header stat card
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: GlassCard(
                      glowColor: AppColors.accent,
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0x22B27EFF), Color(0x114F46E5)],
                      ),
                      child: Row(children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFFB27EFF)]),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [BoxShadow(color: AppColors.accent.withOpacity(0.35), blurRadius: 16)],
                          ),
                          child: const Icon(Icons.contact_phone_rounded, size: 26, color: Colors.white),
                        ),
                        const SizedBox(width: 16),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Fresh Direct Leads', style: TextStyle(color: AppColors.textMuted, fontSize: 12, letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text('${_leads.length} Leads', style: const TextStyle(color: AppColors.textPrimary, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                        ])),
                        IconButton(icon: const Icon(Icons.refresh_rounded, color: AppColors.textMuted), onPressed: _loadDirectLeads),
                      ]),
                    ),
                  );
                }

                final lead = _leads[index - 1];
                final int leadId = lead['id'];
                final bool isCalled = lead['called'] == true;
                final bool isSaving = _isSavingMap[leadId] ?? false;
                final String? selectedStatus = _selectedStatusMap[leadId];

                return Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: GlassCard(
                    glowColor: isCalled ? AppColors.success : null,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          StatusBadge.directLead(),
                          isCalled ? StatusBadge.called() : StatusBadge.notCalled(),
                        ]),
                        const SizedBox(height: 16),

                        Text(lead['lead_name'] ?? 'Unknown', style: const TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        Row(children: [
                          const Icon(Icons.phone_rounded, size: 15, color: AppColors.textMuted),
                          const SizedBox(width: 8),
                          Text(lead['lead_contact'] ?? '', style: const TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                        ]),
                        const SizedBox(height: 20),

                        NeonButton(
                          label: 'CALL',
                          icon: Icons.call_rounded,
                          gradient: AppColors.successGradient,
                          glowColor: AppColors.success,
                          height: 50,
                          onPressed: () => _makePhoneCall(lead['lead_contact'] ?? ''),
                        ),

                        const SizedBox(height: 24),
                        const Divider(color: AppColors.borderSubtle, height: 1),
                        const SizedBox(height: 20),
                        const Text('Update Status 1', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 14),

                        GlassDropdown(
                          value: selectedStatus,
                          hint: 'Select Status',
                          items: _status1Options,
                          label: 'Status 1',
                          onChanged: (val) { if (val != null) setState(() => _selectedStatusMap[leadId] = val); },
                        ),
                        const SizedBox(height: 14),

                        GlassTextField(
                          controller: _remarkControllers[leadId]!,
                          labelText: 'Remark / Call Notes',
                          hintText: 'Add important notes...',
                          maxLines: 2,
                        ),
                        const SizedBox(height: 20),

                        NeonButton(
                          label: 'SUBMIT STATUS 1',
                          icon: Icons.cloud_upload_rounded,
                          onPressed: isSaving ? null : () => _handleUpdateStatus1(leadId),
                          isLoading: isSaving,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
