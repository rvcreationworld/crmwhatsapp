import 'package:flutter/material.dart';

class AppColors {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  static const Color bgDeep    = Color(0xFF07060F); // near-black void
  static const Color bgDark    = Color(0xFF0D0B1A); // dark purple-black
  static const Color bgCard    = Color(0xFF13102A); // elevated card bg
  static const Color bgGlass   = Color(0x1AFFFFFF); // white 10% glass fill
  static const Color bgGlass2  = Color(0x0DFFFFFF); // white 5% glass fill

  // ── Brand / Primary ───────────────────────────────────────────────────────
  static const Color primary        = Color(0xFF7C3AED); // vivid violet
  static const Color primaryLight   = Color(0xFF9F67FF); // lighter violet
  static const Color primaryDark    = Color(0xFF5B21B6); // deep violet
  static const Color secondary      = Color(0xFF4F46E5); // electric indigo
  static const Color accent         = Color(0xFFB27EFF); // neon lavender

  // ── Glows ─────────────────────────────────────────────────────────────────
  static const Color glowPrimary  = Color(0x337C3AED); // violet glow 20%
  static const Color glowAccent   = Color(0x26B27EFF); // lavender glow 15%
  static const Color glowGreen    = Color(0x2610B981); // green glow
  static const Color glowRed      = Color(0x26EF4444); // red glow
  static const Color glowAmber    = Color(0x26F59E0B); // amber glow

  // ── Semantic ──────────────────────────────────────────────────────────────
  static const Color success    = Color(0xFF10B981); // emerald
  static const Color warning    = Color(0xFFF59E0B); // amber
  static const Color error      = Color(0xFFEF4444); // red
  static const Color info       = Color(0xFF38BDF8); // sky blue

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary  = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFBDB8D8); // lavender-grey
  static const Color textMuted    = Color(0xFF6B6485);  // muted purple-grey
  static const Color textHint     = Color(0xFF3F3D52);  // very dim

  // ── Borders ───────────────────────────────────────────────────────────────
  static const Color borderGlass  = Color(0x33FFFFFF); // white 20%
  static const Color borderPrimary = Color(0x557C3AED); // violet 33%
  static const Color borderSubtle = Color(0x1AFFFFFF); // white 10%

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF0D0B1A), Color(0xFF07060F)],
  );

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF7C3AED), Color(0xFF4F46E5)],
  );

  static const LinearGradient primaryGradientHover = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF9F67FF), Color(0xFF6366F1)],
  );

  static const LinearGradient cardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x1AFFFFFF), Color(0x0DFFFFFF)],
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF059669), Color(0xFF10B981)],
  );

  static const LinearGradient errorGradient = LinearGradient(
    colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
  );

  static const LinearGradient amberGradient = LinearGradient(
    colors: [Color(0xFFD97706), Color(0xFFF59E0B)],
  );
}
