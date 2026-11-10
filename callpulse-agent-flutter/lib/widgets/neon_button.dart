import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Premium gradient button with glow shadow and loading state.
class NeonButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Gradient? gradient;
  final Color? glowColor;
  final double height;
  final double? width;
  final double borderRadius;
  final TextStyle? textStyle;

  const NeonButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.gradient,
    this.glowColor,
    this.height = 54,
    this.width,
    this.borderRadius = 16,
    this.textStyle,
  });

  /// Danger (red-glass) variant for destructive actions.
  const NeonButton.danger({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.height = 54,
    this.width,
    this.borderRadius = 16,
    this.textStyle,
  })  : gradient = const LinearGradient(
          colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
        ),
        glowColor = const Color(0xFFEF4444);

  /// Secondary (glass border) variant.
  const NeonButton.secondary({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.height = 54,
    this.width,
    this.borderRadius = 16,
    this.textStyle,
  })  : gradient = null,
        glowColor = null;

  @override
  State<NeonButton> createState() => _NeonButtonState();
}

class _NeonButtonState extends State<NeonButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.95,
      upperBound: 1.0,
      value: 1.0,
    );
    _scaleAnim = _controller;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(_) => _controller.animateTo(0.95);
  void _onTapUp(_) => _controller.animateTo(1.0);
  void _onTapCancel() => _controller.animateTo(1.0);

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onPressed == null || widget.isLoading;
    final gradient = widget.gradient ?? AppColors.primaryGradient;
    final glow = widget.glowColor ?? AppColors.primary;
    final isSecondary = widget.gradient == null && widget.glowColor == null;

    return ScaleTransition(
      scale: _scaleAnim,
      child: GestureDetector(
        onTapDown: disabled ? null : _onTapDown,
        onTapUp: disabled ? null : _onTapUp,
        onTapCancel: disabled ? null : _onTapCancel,
        onTap: disabled ? null : widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: widget.width ?? double.infinity,
          height: widget.height,
          decoration: BoxDecoration(
            gradient: isSecondary ? null : (disabled ? null : gradient),
            color: isSecondary
                ? AppColors.bgGlass
                : disabled
                    ? AppColors.textHint
                    : null,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: isSecondary
                  ? AppColors.borderPrimary
                  : disabled
                      ? Colors.transparent
                      : glow.withOpacity(0.4),
              width: 1.5,
            ),
            boxShadow: disabled || isSecondary
                ? null
                : [
                    BoxShadow(
                      color: glow.withOpacity(0.35),
                      blurRadius: 20,
                      spreadRadius: 0,
                      offset: const Offset(0, 6),
                    ),
                  ],
          ),
          child: Center(
            child: widget.isLoading
                ? SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: isSecondary ? AppColors.primary : Colors.white,
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(
                          widget.icon,
                          size: 20,
                          color: isSecondary
                              ? AppColors.primaryLight
                              : Colors.white,
                        ),
                        const SizedBox(width: 10),
                      ],
                      Text(
                        widget.label,
                        style: widget.textStyle ??
                            AppTextStyles.buttonLarge.copyWith(
                              color: isSecondary
                                  ? AppColors.primaryLight
                                  : Colors.white,
                            ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
