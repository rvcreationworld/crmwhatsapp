import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Glassmorphism card with backdrop blur, gradient fill, and glowing border.
class GlassCard extends StatelessWidget {
  final Widget child;
  final double? borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Gradient? gradient;
  final Color? borderColor;
  final double? blurSigma;
  final Color? glowColor;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.borderRadius = 24,
    this.padding = const EdgeInsets.all(20),
    this.margin,
    this.gradient,
    this.borderColor,
    this.blurSigma = 16,
    this.glowColor,
    this.width,
    this.height,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(borderRadius ?? 24);
    Widget card = ClipRRect(
      borderRadius: br,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurSigma!, sigmaY: blurSigma!),
        child: Container(
          width: width,
          height: height,
          padding: padding,
          decoration: BoxDecoration(
            gradient: gradient ?? AppColors.cardGradient,
            borderRadius: br,
            border: Border.all(
              color: borderColor ?? AppColors.borderGlass,
              width: 1,
            ),
          ),
          child: child,
        ),
      ),
    );

    if (glowColor != null) {
      card = Container(
        margin: margin,
        decoration: BoxDecoration(
          borderRadius: br,
          boxShadow: [
            BoxShadow(
              color: glowColor!.withOpacity(0.18),
              blurRadius: 32,
              spreadRadius: 0,
            ),
          ],
        ),
        child: card,
      );
    } else if (margin != null) {
      card = Padding(padding: margin!, child: card);
    }

    if (onTap != null) {
      card = GestureDetector(onTap: onTap, child: card);
    }

    return card;
  }
}
