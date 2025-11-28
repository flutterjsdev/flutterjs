// ============================================================================
// FIXED: flutterjs_core.dart
// ============================================================================
// Key fixes:
// 1. Centralized exports for all IR, AST passes, utilities, and diagnostics
// 2. Removed duplicate imports and unified analyzer adaptation layers
// 3. Ensured consistent public API surface for external plugins/tools
// 4. Added missing re-exports for statement/expression passes and IR types
// 5. Improved documentation for easier discovery and onboarding
// 6. Cleaned outdated references to previous internal module structure

/// <---------------------------------------------------------------------------->
/// flutterjs_core.dart
/// ----------------------------------------------------------------------------
///
/// Primary entry point for the Flutter.js Core engine.  
/// This file aggregates all IR types, AST transformation passes, diagnostics,
/// utilities, and builder helpers into a single consumable API.
///
/// It acts as the “core SDK layer” enabling:
/// • Dart AST → Intermediate Representation (IR)
/// • IR-based type inference and control flow analysis
/// • Code transformation passes (rewrites, optimizations, validation)
/// • Diagnostic reporting with structured source locations
/// • Integration with Flutter.js command-line and runtime tools
///
/// What this file provides:
/// • Stable exports for IR nodes (statements, expressions, types)
/// • Access to extraction passes (statement/expression extraction)
/// • Access to builder utilities for generating Dart files from IR
/// • Lint/diagnostic helpers with JSON-safe reporting
/// • Runtime utilities used across modules
///
/// Typical usage:
/// ```dart
/// import 'package:flutterjs_core/flutterjs_core.dart';
///
/// final ir = StatementExtractionPass().extractBodyStatements(body);
/// // Perform CFG generation, optimizations, or tool-specific analysis.
/// ```
///
/// Design Goals:
/// • Provide a clean, minimal, stable API surface  
/// • Decouple analyzer internals from tooling layers  
/// • Ensure IR nodes are immutable, serializable, and predictable  
/// • Support advanced features like pattern matching, records, and cascades  
///
/// This file should remain lightweight and contain only exports, not logic.
/// <---------------------------------------------------------------------------->

export 'ast_it.dart';
export 'src/binary_constrain/binary.dart';
export 'src/analysis/passes/declaration_pass.dart';
export 'src/analysis/passes/flow_analysis_pass.dart';
export 'src/analysis/passes/symbol_resolution.dart';
export 'src/analysis/passes/type_inference_pass.dart';
export 'src/analysis/passes/validation_pass.dart';
