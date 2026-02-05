// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// PHASE 3.2: WIDGET INSTANTIATION CODE GENERATOR
// ============================================================================
// Converts Dart widget instantiation expressions to JavaScript
// Validates properties against registry
// Handles prop type conversion
// Throws warnings for deprecated/beta widgets
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';
import 'package:flutterjs_gen/src/utils/indenter.dart';
import '../../code_generation/expression/expression_code_generator.dart';
import '../prop_conversion/flutter_prop_converters.dart';
import '../registry/flutter_widget_registry.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for widget instantiation generation
class WidgetInstantiationConfig {
  /// Whether to warn about beta/alpha widgets
  final bool warnAboutUnstableWidgets;

  /// Whether to error on deprecated widgets
  final bool errorOnDeprecatedWidgets;

  /// Whether to validate all properties
  final bool strictPropertyValidation;

  /// Whether to generate JSDoc for widgets
  final bool generateJSDoc;

  /// Whether to pretty-print props
  final bool prettyPrintProps;

  /// Indentation string
  final String indent;

  const WidgetInstantiationConfig({
    this.warnAboutUnstableWidgets = true,
    this.errorOnDeprecatedWidgets = true,
    this.strictPropertyValidation = true,
    this.generateJSDoc = false,
    this.prettyPrintProps = true,
    this.indent = '  ',
  });
}

// ============================================================================
// MAIN WIDGET INSTANTIATION GENERATOR
// ============================================================================

class WidgetInstantiationCodeGen {
  final WidgetInstantiationConfig config;
  final FlutterWidgetRegistry registry;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenWarning> warnings = [];
  final List<CodeGenError> errors = [];

  final FlutterPropConverter propConverter;

  WidgetInstantiationCodeGen({
    WidgetInstantiationConfig? config,
    ExpressionCodeGen? exprGen,
    FlutterPropConverter? propConverter,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const WidgetInstantiationConfig(),
       registry = FlutterWidgetRegistry(),
       exprGen = exprGen ?? ExpressionCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Generate widget instantiation code
  String generateWidgetInstantiation(InstanceCreationExpressionIR expr) {
    try {
      final widgetType = expr.type.displayName();
      // Check if widget is registered in the registry
      final isKnown = FlutterWidgetRegistry.isKnownWidget(widgetType);

      // Check if widget is registered
      if (!isKnown) {
        return _generateCustomWidgetInstantiation(expr, widgetType);
      }
      // Get widget info from registry
      final jsInfo = FlutterWidgetRegistry.getWidget(widgetType);
      if (jsInfo == null) {
        return _generateCustomWidgetInstantiation(expr, widgetType);
      }

      // Check stability and issue warnings/errors
      _checkWidgetStability(widgetType, jsInfo);

      // Generate instantiation
      return _generateKnownWidgetInstantiation(expr, jsInfo);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate widget instantiation: $e',
        expressionType: expr.runtimeType.toString(),
        suggestion: 'Check widget type and properties',
      );
      errors.add(error);
      rethrow;
    }
  }

  // =========================================================================
  // STABILITY CHECKING
  // =========================================================================

  void _checkWidgetStability(String widgetName, JSWidgetInfo jsInfo) {
    switch (jsInfo.stability) {
      case WidgetStability.deprecated:
        if (config.errorOnDeprecatedWidgets) {
          final warning = jsInfo.getDeprecationWarning();
          final error = CodeGenError(
            message: 'Widget "$widgetName" is DEPRECATED and cannot be used',
            expressionType: 'InstanceCreationExpressionIR',
            suggestion: warning ?? 'Use an alternative widget',
          );
          errors.add(error);
        }
        break;

      case WidgetStability.beta:
        if (config.warnAboutUnstableWidgets) {
          final warning = CodeGenWarning(
            severity: WarningSeverity.warning,
            message:
                'Widget "$widgetName" is in BETA (v${jsInfo.version.version})',
            details:
                'Features may change. Limitations: ${jsInfo.limitations.join(", ")}',
            suggestion: 'Use a stable widget for production',
            widget: widgetName,
          );
          warnings.add(warning);
        }
        break;

      case WidgetStability.alpha:
        if (config.warnAboutUnstableWidgets) {
          final warning = CodeGenWarning(
            severity: WarningSeverity.warning,
            message:
                'Widget "$widgetName" is ALPHA (v${jsInfo.version.version})',
            details: 'API may change. Not for production use.',
            suggestion: 'Only use for experimental features',
            widget: widgetName,
          );
          warnings.add(warning);
        }
        break;

      case WidgetStability.dev:
        final warning = CodeGenWarning(
          severity: WarningSeverity.error,
          message: 'Widget "$widgetName" is DEV-ONLY and not available',
          suggestion: 'Remove this widget from production code',
          widget: widgetName,
        );
        warnings.add(warning);
        break;

      case WidgetStability.stable:
        // No warning for stable widgets
        break;
    }
  }

  // =========================================================================
  // KNOWN WIDGET INSTANTIATION
  // =========================================================================

  String _generateKnownWidgetInstantiation(
    InstanceCreationExpressionIR expr,
    JSWidgetInfo jsInfo,
  ) {
    final props = <String, String>{};
    final invalidProps = <String, String>{};

    // Process named arguments
    for (final entry in expr.namedArguments.entries) {
      final propName = entry.key;
      final propValue = entry.value;

      // Check if property exists in widget info
      if (!jsInfo.props.containsKey(propName)) {
        if (config.strictPropertyValidation) {
          invalidProps[propName] = 'Unknown property';
        }
        // Still try to generate it
        props[propName] = exprGen.generate(propValue, parenthesize: false);
        continue;
      }

      final propInfo = jsInfo.props[propName]!;

      // Warn if property is deprecated
      if (propInfo.isDeprecated) {
        final warning = CodeGenWarning(
          severity: WarningSeverity.warning,
          message:
              'Property "$propName" is deprecated in widget "${jsInfo.jsClass}"',
          details:
              'Deprecated in v${propInfo.deprecatedInVersion}. Use "${propInfo.replacedBy}" instead.',
          suggestion: 'Replace with ${propInfo.replacedBy}',
          widget: jsInfo.jsClass,
          property: propName,
        );
        warnings.add(warning);
      }

      // Check if required
      if (propInfo.isRequired) {
        final error = CodeGenError(
          message:
              'Required property "$propName" missing in widget "${jsInfo.jsClass}"',
          expressionType: 'PropertyInfo',
          suggestion: 'Add the required property',
        );
        errors.add(error);
      }

      // Convert property value
      final jsValue = _convertPropValue(propValue, propInfo);
      props[propName] = jsValue;
    }

    // Check for missing required properties
    for (final propInfo in jsInfo.getActiveProperties()) {
      if (propInfo.isRequired && !props.containsKey(propInfo.name)) {
        final error = CodeGenError(
          message:
              'Required property "${propInfo.name}" missing in widget "${jsInfo.jsClass}"',
          expressionType: 'PropertyInfo',
          suggestion: 'Add: ${propInfo.name}: <value>',
        );
        errors.add(error);
      }
    }

    // Report invalid properties if strict validation
    if (invalidProps.isNotEmpty && config.strictPropertyValidation) {
      for (final entry in invalidProps.entries) {
        final warning = CodeGenWarning(
          severity: WarningSeverity.warning,
          message:
              'Unknown property "${entry.key}" in widget "${jsInfo.jsClass}"',
          suggestion: 'Check property name spelling',
          widget: jsInfo.jsClass,
          property: entry.key,
        );
        warnings.add(warning);
      }
    }

    // Generate instantiation
    return _formatWidgetInstantiation(jsInfo.jsClass, props);
  }

  // =========================================================================
  // CUSTOM WIDGET INSTANTIATION
  // =========================================================================

  String _generateCustomWidgetInstantiation(
    InstanceCreationExpressionIR expr,
    String widgetType,
  ) {
    final warning = CodeGenWarning(
      severity: WarningSeverity.info,
      message: 'Unknown widget "$widgetType" treated as custom widget',
      details:
          'Widget not in Flutter registry. Assuming it\'s a custom widget.',
      widget: widgetType,
    );
    warnings.add(warning);

    // Generate generic instantiation
    final props = <String, String>{};

    for (final entry in expr.namedArguments.entries) {
      final jsValue = exprGen.generate(entry.value, parenthesize: false);
      props[entry.key] = jsValue;
    }

    return _formatWidgetInstantiation(widgetType, props);
  }

  // =========================================================================
  // PROPERTY CONVERSION
  // =========================================================================

  String _convertPropValue(ExpressionIR expr, PropertyInfo propInfo) {
    // Convert PropType to string for prop converter
    final typeString = _propTypeToString(propInfo.type);

    // Use the prop converter
    final result = propConverter.convertProperty(
      propInfo.name,
      expr,
      typeString,
    );

    // Log warnings if conversion failed
    if (!result.isSuccessful) {
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message:
              'Property conversion failed for "${propInfo.name}": ${result.errors.join(", ")}',
          widget: 'unknown',
        ),
      );
    }

    // Return the converted code (never null due to fallback in propConverter)
    return result.code;
  }

  String _propTypeToString(PropType propType) {
    return switch (propType) {
      PropType.string => 'String',
      PropType.int => 'int',
      PropType.double => 'double',
      PropType.bool => 'bool',
      PropType.dynamic => 'dynamic',
      PropType.widget => 'Widget',
      PropType.widgetList => 'List<Widget>',
      PropType.color => 'Color',
      PropType.alignment => 'Alignment',
      PropType.edgeInsets => 'EdgeInsets',
      PropType.textStyle => 'TextStyle',
      PropType.textAlign => 'TextAlign',
      PropType.mainAxisAlignment => 'MainAxisAlignment',
      PropType.crossAxisAlignment => 'CrossAxisAlignment',
      PropType.boxFit => 'BoxFit',
      PropType.crossAxisSize => 'CrossAxisSize',
      PropType.mainAxisSize => 'MainAxisSize',
      PropType.function => 'Function',
      PropType.callback => 'Callback',
      PropType.duration => 'Duration',
      PropType.curve => 'Curve',
      PropType.key => 'Key',
    };
  }

  // =========================================================================
  // FORMATTING
  // =========================================================================

  String _formatWidgetInstantiation(
    String className,
    Map<String, String> props,
  ) {
    if (props.isEmpty) {
      return 'new $className({})';
    }

    if (!config.prettyPrintProps) {
      final propsStr = props.entries
          .map((e) => '${e.key}: ${e.value}')
          .join(', ');
      return 'new $className({$propsStr})';
    }

    // Pretty print with indentation
    final buffer = StringBuffer();
    buffer.write('new $className({\n');

    indenter.indent();
    final entries = props.entries.toList();
    for (int i = 0; i < entries.length; i++) {
      final entry = entries[i];
      buffer.write(indenter.line('${entry.key}: ${entry.value}'));

      if (i < entries.length - 1) {
        buffer.write(',\n');
      } else {
        buffer.write('\n');
      }
    }
    indenter.dedent();

    buffer.write(indenter.line('}'));

    return buffer.toString();
  }

  /// Get all warnings generated so far
  List<CodeGenWarning> getWarnings() => List.unmodifiable(warnings);

  /// Get all errors generated so far
  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  /// Clear warnings and errors
  void clearIssues() {
    warnings.clear();
    errors.clear();
  }

  /// Generate warning/error report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║   WIDGET INSTANTIATION ISSUES REPORT               ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    if (errors.isEmpty && warnings.isEmpty) {
      buffer.writeln('✅ No issues found!\n');
      return buffer.toString();
    }

    if (errors.isNotEmpty) {
      buffer.writeln('❌ ERRORS (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - ${error.message}');
        if (error.suggestion != null) {
          buffer.writeln('    💡 ${error.suggestion}');
        }
      }
      buffer.writeln();
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('⚠️  WARNINGS (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - ${warning.message}');
        if (warning.details != null) {
          buffer.writeln('    📝 ${warning.details}');
        }
        if (warning.suggestion != null) {
          buffer.writeln('    💡 ${warning.suggestion}');
        }
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// WARNING & ERROR TYPES
// ============================================================================

// ============================================================================
// HELPER: INDENTER
// ============================================================================
