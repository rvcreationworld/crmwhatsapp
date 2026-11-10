import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// A premium badge chip for status, lock, call type, etc.
class StatusBadge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color color;
  final Color? bgColor;

  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.bgColor,
  });

  // ── Presets ────────────────────────────────────────────────────────────────

  factory StatusBadge.called() => const StatusBadge(
        label: 'CALLED',
        icon: Icons.phone_callback_rounded,
        color: AppColors.success,
      );

  factory StatusBadge.notCalled() => const StatusBadge(
        label: 'NOT CALLED',
        icon: Icons.phone_missed_rounded,
        color: AppColors.warning,
      );

  factory StatusBadge.locked(String reason) => StatusBadge(
        label: reason.toUpperCase(),
        icon: Icons.lock_rounded,
        color: AppColors.warning,
      );

  factory StatusBadge.kycDone() => const StatusBadge(
        label: 'KYC DONE',
        icon: Icons.verified_rounded,
        color: AppColors.accent,
      );

  factory StatusBadge.underUs() => const StatusBadge(
        label: 'UNDER US',
        icon: Icons.shield_rounded,
        color: AppColors.info,
      );

  factory StatusBadge.inQueue(int pos) => StatusBadge(
        label: 'QUEUE #$pos',
        icon: Icons.queue_rounded,
        color: AppColors.primaryLight,
      );

  factory StatusBadge.directLead() => const StatusBadge(
        label: 'DIRECT LEAD',
        icon: Icons.contact_phone_rounded,
        color: AppColors.secondary,
      );

  factory StatusBadge.transferredLead() => const StatusBadge(
        label: 'TRANSFERRED',
        icon: Icons.forward_to_inbox_rounded,
        color: AppColors.primary,
      );

  factory StatusBadge.freeLead() => const StatusBadge(
        label: 'FREE LEAD',
        icon: Icons.redeem_rounded,
        color: AppColors.accent,
      );

  factory StatusBadge.botLead() => const StatusBadge(
        label: 'BOT LEAD',
        icon: Icons.smart_toy_rounded,
        color: AppColors.secondary,
      );

  factory StatusBadge.outgoing() => const StatusBadge(
        label: 'OUTGOING',
        icon: Icons.call_made_rounded,
        color: AppColors.success,
      );

  factory StatusBadge.incoming() => const StatusBadge(
        label: 'INCOMING',
        icon: Icons.call_received_rounded,
        color: AppColors.info,
      );

  factory StatusBadge.missed() => const StatusBadge(
        label: 'MISSED',
        icon: Icons.call_missed_rounded,
        color: AppColors.error,
      );

  factory StatusBadge.rejected() => const StatusBadge(
        label: 'REJECTED',
        icon: Icons.call_end_rounded,
        color: AppColors.error,
      );

  @override
  Widget build(BuildContext context) {
    final bg = bgColor ?? color.withOpacity(0.15);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.4), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: color),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: AppTextStyles.label.copyWith(
              color: color,
              fontSize: 10,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}
