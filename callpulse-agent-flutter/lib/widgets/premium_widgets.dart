import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Full-screen dark gradient background with decorative radial glow blobs.
class AppBackground extends StatelessWidget {
  final Widget child;
  const AppBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Stack(
      children: [
        // Base gradient
        Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        ),
        // Top-left violet blob
        Positioned(
          top: -60,
          left: -60,
          child: _Blob(size: size.width * 0.7, color: AppColors.primary.withOpacity(0.12)),
        ),
        // Bottom-right indigo blob
        Positioned(
          bottom: -80,
          right: -80,
          child: _Blob(size: size.width * 0.65, color: AppColors.secondary.withOpacity(0.10)),
        ),
        // Centre soft glow
        Positioned(
          top: size.height * 0.3,
          left: size.width * 0.1,
          child: _Blob(size: size.width * 0.5, color: AppColors.accent.withOpacity(0.05)),
        ),
        // Content
        child,
      ],
    );
  }
}

class _Blob extends StatelessWidget {
  final double size;
  final Color color;
  const _Blob({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
          stops: const [0.0, 1.0],
        ),
      ),
    );
  }
}

/// Shared premium scaffold that wraps any page with the dark background.
class PremiumScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final bool resizeToAvoidBottomInset;

  const PremiumScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.resizeToAvoidBottomInset = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      appBar: appBar,
      bottomNavigationBar: bottomNavigationBar,
      body: AppBackground(child: body),
    );
  }
}

/// Standard empty state widget used across screens.
class EmptyState extends StatelessWidget {
  final String message;
  final IconData icon;
  final String? subtitle;

  const EmptyState({
    super.key,
    required this.message,
    this.icon = Icons.inbox_rounded,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.bgGlass,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(icon, size: 48, color: AppColors.textMuted),
            ),
            const SizedBox(height: 20),
            Text(message, style: const TextStyle(color: AppColors.textSecondary, fontSize: 17, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!, style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.5), textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}

/// Standard error state widget.
class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorState({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.glowRed,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.error.withOpacity(0.3)),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
            ),
            const SizedBox(height: 20),
            Text(message, style: const TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.5), textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Premium glass input field with purple focus ring.
class GlassTextField extends StatelessWidget {
  final TextEditingController controller;
  final String labelText;
  final String? hintText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool enabled;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  const GlassTextField({
    super.key,
    required this.controller,
    required this.labelText,
    this.hintText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.enabled = true,
    this.textInputAction,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      maxLines: obscureText ? 1 : maxLines,
      enabled: enabled,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: labelText,
        labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        hintText: hintText,
        hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 14),
        prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: AppColors.accent, size: 20) : null,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: AppColors.bgGlass,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderSubtle),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      ),
    );
  }
}

/// Glass Dropdown field.
class GlassDropdown extends StatelessWidget {
  final String? value;
  final String hint;
  final List<String> items;
  final ValueChanged<String?>? onChanged;
  final bool enabled;
  final String label;

  const GlassDropdown({
    super.key,
    required this.value,
    required this.hint,
    required this.items,
    this.onChanged,
    this.enabled = true,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: value != null && items.contains(value) ? value : null,
      hint: Text(hint, style: const TextStyle(color: AppColors.textHint, fontSize: 14)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        filled: true,
        fillColor: AppColors.bgGlass,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.borderSubtle)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.borderSubtle)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.borderSubtle)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      ),
      dropdownColor: const Color(0xFF1A1630),
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      iconEnabledColor: AppColors.accent,
      iconDisabledColor: AppColors.textHint,
      items: items.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
      onChanged: enabled ? onChanged : null,
    );
  }
}

/// Snackbar helper with premium styling.
class PremiumSnackbar {
  static void show(BuildContext context, String message, {bool isError = false, bool isSuccess = false}) {
    Color bgColor = const Color(0xFF1A1630);
    Color borderColor = AppColors.primary;
    IconData icon = Icons.info_outline_rounded;

    if (isError) {
      bgColor = AppColors.glowRed;
      borderColor = AppColors.error;
      icon = Icons.error_outline_rounded;
    } else if (isSuccess) {
      bgColor = AppColors.glowGreen;
      borderColor = AppColors.success;
      icon = Icons.check_circle_outline_rounded;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: isError ? AppColors.error : isSuccess ? AppColors.success : AppColors.primaryLight, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13))),
          ],
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: bgColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: borderColor.withOpacity(0.5), width: 1),
        ),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        duration: const Duration(seconds: 3),
        elevation: 8,
      ),
    );
  }
}

/// A stat card used in dashboard.
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgGlass2,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.08), blurRadius: 16, spreadRadius: 0),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(color: AppColors.textPrimary, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5, shadows: [Shadow(color: color.withOpacity(0.4), blurRadius: 8)])),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.5)),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle!, style: TextStyle(color: color.withOpacity(0.8), fontSize: 10, fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }
}

/// Floating glass bottom navigation bar
class GlassBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const GlassBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const items = [
      _NavItem(icon: Icons.dashboard_rounded, label: 'Dashboard'),
      _NavItem(icon: Icons.smart_toy_rounded, label: 'Bot Lead'),
      _NavItem(icon: Icons.card_giftcard_rounded, label: 'Free Lead'),
      _NavItem(icon: Icons.contact_phone_rounded, label: 'Direct Leads'),
      _NavItem(icon: Icons.swap_horiz_rounded, label: 'Transferred'),
      _NavItem(icon: Icons.history_rounded, label: 'Calls'),
      _NavItem(icon: Icons.settings_rounded, label: 'Settings'),
    ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Container(
            height: 68,
            decoration: BoxDecoration(
              color: const Color(0xCC0D0B1A),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.borderGlass.withOpacity(0.15), width: 1),
              boxShadow: [
                BoxShadow(color: AppColors.primary.withOpacity(0.12), blurRadius: 24, spreadRadius: 0, offset: const Offset(0, 8)),
                const BoxShadow(color: Colors.black54, blurRadius: 20, spreadRadius: 0),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: items.asMap().entries.map((e) {
                final selected = e.key == currentIndex;
                return _NavButton(item: e.value, selected: selected, onTap: () => onTap(e.key));
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});
}

class _NavButton extends StatelessWidget {
  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;

  const _NavButton({required this.item, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withOpacity(0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              child: Icon(
                item.icon,
                size: 22,
                color: selected ? AppColors.primaryLight : AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: selected ? AppColors.primaryLight : AppColors.textMuted,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
