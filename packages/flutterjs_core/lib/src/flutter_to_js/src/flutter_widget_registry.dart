// ============================================================================
// PHASE 3.1: FLUTTER WIDGET REGISTRY WITH VERSIONING & STABILITY
// ============================================================================
// Comprehensive registry of Flutter widgets with:
// - Version tracking
// - Stability status (stable, beta, alpha, dev)
// - Feature support
// - Deprecation warnings
// - Property validation
// ============================================================================

import 'package:collection/collection.dart';

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/// Widget stability status
enum WidgetStability {
  stable, // Fully supported, recommended
  beta, // Feature-complete, minor issues may exist
  alpha, // Incomplete, breaking changes likely
  dev, // Experimental, for internal use only
  deprecated, // Marked for removal
}

/// Property type for validation
enum PropType {
  // Primitives
  string,
  int,
  double,
  bool,
  dynamic,

  // Flutter types
  widget,
  widgetList,
  color,
  alignment,
  edgeInsets,
  textStyle,
  textAlign,
  mainAxisAlignment,
  crossAxisAlignment,
  boxFit,
  crossAxisSize,
  mainAxisSize,

  // Complex types
  function,
  callback,
  duration,
  curve,
  key,
}

/// Version information
class VersionInfo {
  /// Semantic version (e.g., "2.0.0")
  final String version;

  /// Minimum Flutter version required
  final String minFlutterVersion;

  /// Minimum JavaScript runtime version
  final String minJSVersion;

  /// When this version was released
  final DateTime? releaseDate;

  /// Breaking changes in this version
  final List<String> breakingChanges;

  VersionInfo({
    required this.version,
    required this.minFlutterVersion,
    required this.minJSVersion,
    this.releaseDate,
    this.breakingChanges = const [],
  });

  @override
  String toString() =>
      'v$version (Flutter $minFlutterVersion, JS $minJSVersion)';
}

/// Property information
class PropertyInfo {
  /// Property name
  final String name;

  /// Property type
  final PropType type;

  /// Whether property is required
  final bool isRequired;

  /// Default value description
  final String? defaultValue;

  /// Description of what this property does
  final String? description;

  /// When this property was added
  final String? addedInVersion;

  /// When this property was deprecated (if applicable)
  final String? deprecatedInVersion;

  /// Recommended replacement property
  final String? replacedBy;

  PropertyInfo({
    required this.name,
    required this.type,
    this.isRequired = false,
    this.defaultValue,
    this.description,
    this.addedInVersion,
    this.deprecatedInVersion,
    this.replacedBy,
  });

  bool get isDeprecated => deprecatedInVersion != null;

  @override
  String toString() => '$name: ${type.name}${isRequired ? ' (required)' : ''}';
}

/// Complete widget information
class JSWidgetInfo {
  /// JavaScript class name
  final String jsClass;

  /// Source file path
  final String file;

  /// All supported properties
  final Map<String, PropertyInfo> props;

  /// Widget stability status
  final WidgetStability stability;

  /// Version information
  final VersionInfo version;

  /// Description of what widget does
  final String description;

  /// Known issues or limitations
  final List<String> limitations;

  /// Alternative widgets if this is deprecated
  final List<String> alternatives;

  /// Whether this widget has custom conversion logic
  final bool hasCustomConverter;

  /// Notes about conversion to JS
  final String? conversionNotes;

  JSWidgetInfo({
    required this.jsClass,
    required this.file,
    required this.props,
    required this.stability,
    required this.version,
    required this.description,
    this.limitations = const [],
    this.alternatives = const [],
    this.hasCustomConverter = false,
    this.conversionNotes,
  });

  /// Check if widget is production-ready
  bool get isProductionReady =>
      stability == WidgetStability.stable && !isDeprecated;

  /// Check if widget is deprecated
  bool get isDeprecated => stability == WidgetStability.deprecated;

  /// Get all properties including deprecated ones
  List<PropertyInfo> getAllProperties() => props.values.toList();

  /// Get only active (non-deprecated) properties
  List<PropertyInfo> getActiveProperties() =>
      props.values.where((p) => !p.isDeprecated).toList();

  /// Get deprecation warning message
  String? getDeprecationWarning() {
    if (!isDeprecated) return null;

    final buffer = StringBuffer();
    buffer.writeln('⚠️  Widget "$jsClass" is DEPRECATED');

    if (alternatives.isNotEmpty) {
      buffer.writeln('Alternatives: ${alternatives.join(", ")}');
    }

    if (conversionNotes != null) {
      buffer.writeln('Migration: $conversionNotes');
    }

    return buffer.toString();
  }

  @override
  String toString() => '$jsClass (${stability.name}) - ${version.version}';
}

// ============================================================================
// FLUTTER WIDGET REGISTRY
// ============================================================================

class FlutterWidgetRegistry {
  /// Complete registry of all Flutter widgets
  static final Map<String, JSWidgetInfo> dartToJSWidgets = {
    // ========================================================================
    // BASIC WIDGETS (Stable)
    // ========================================================================
    'Container': JSWidgetInfo(
      jsClass: 'Container',
      file: 'widgets/container.js',
      stability: WidgetStability.stable,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2021, 1, 1),
      ),
      description:
          'A widget that combines common painting, positioning, and sizing widgets',
      props: {
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget inside the container',
        ),
        'alignment': PropertyInfo(
          name: 'alignment',
          type: PropType.alignment,
          defaultValue: 'topLeft',
          description: 'How to align the child',
        ),
        'padding': PropertyInfo(
          name: 'padding',
          type: PropType.edgeInsets,
          description: 'Empty space inside the container around the child',
        ),
        'margin': PropertyInfo(
          name: 'margin',
          type: PropType.edgeInsets,
          description: 'Empty space around the container',
        ),
        'color': PropertyInfo(
          name: 'color',
          type: PropType.color,
          description: 'The color to fill the container with',
        ),
        'width': PropertyInfo(
          name: 'width',
          type: PropType.double,
          description: 'The width of the container',
        ),
        'height': PropertyInfo(
          name: 'height',
          type: PropType.double,
          description: 'The height of the container',
        ),
      },
    ),

    'Text': JSWidgetInfo(
      jsClass: 'Text',
      file: 'widgets/text.js',
      stability: WidgetStability.stable,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
      ),
      description: 'A run of text with a single style',
      props: {
        'data': PropertyInfo(
          name: 'data',
          type: PropType.string,
          isRequired: true,
          description: 'The text to display',
        ),
        'style': PropertyInfo(
          name: 'style',
          type: PropType.textStyle,
          description: 'How the text should be styled',
        ),
        'textAlign': PropertyInfo(
          name: 'textAlign',
          type: PropType.textAlign,
          defaultValue: 'start',
          description: 'How the text should be aligned horizontally',
        ),
        'maxLines': PropertyInfo(
          name: 'maxLines',
          type: PropType.int,
          description: 'Maximum number of lines',
        ),
      },
    ),

    'Row': JSWidgetInfo(
      jsClass: 'Row',
      file: 'widgets/flex.js',
      stability: WidgetStability.stable,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
      ),
      description: 'A widget that displays children in a horizontal array',
      props: {
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          defaultValue: '[]',
          description: 'The widgets to display horizontally',
        ),
        'mainAxisAlignment': PropertyInfo(
          name: 'mainAxisAlignment',
          type: PropType.mainAxisAlignment,
          defaultValue: 'start',
          description: 'How to arrange children along the horizontal axis',
        ),
        'crossAxisAlignment': PropertyInfo(
          name: 'crossAxisAlignment',
          type: PropType.crossAxisAlignment,
          defaultValue: 'center',
          description: 'How to arrange children along the vertical axis',
        ),
      },
    ),

    'Column': JSWidgetInfo(
      jsClass: 'Column',
      file: 'widgets/flex.js',
      stability: WidgetStability.stable,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
      ),
      description: 'A widget that displays children in a vertical array',
      props: {
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          defaultValue: '[]',
          description: 'The widgets to display vertically',
        ),
        'mainAxisAlignment': PropertyInfo(
          name: 'mainAxisAlignment',
          type: PropType.mainAxisAlignment,
          defaultValue: 'start',
          description: 'How to arrange children along the vertical axis',
        ),
        'crossAxisAlignment': PropertyInfo(
          name: 'crossAxisAlignment',
          type: PropType.crossAxisAlignment,
          defaultValue: 'center',
          description: 'How to arrange children along the horizontal axis',
        ),
      },
    ),

    // ========================================================================
    // INPUT WIDGETS (Stable)
    // ========================================================================
    'Button': JSWidgetInfo(
      jsClass: 'Button',
      file: 'widgets/button.js',
      stability: WidgetStability.stable,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
      ),
      description: 'A button widget',
      props: {
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to display inside the button',
        ),
        'onPressed': PropertyInfo(
          name: 'onPressed',
          type: PropType.callback,
          description: 'Callback when button is pressed',
        ),
      },
    ),

    'TextField': JSWidgetInfo(
      jsClass: 'TextField',
      file: 'widgets/textfield.js',
      stability: WidgetStability.beta,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        breakingChanges: ['Controller parameter renamed to "controller"'],
      ),
      description: 'A text input field with optional decorations',
      limitations: [
        'Complex decorations may not render identically',
        'Some IME behaviors not supported',
      ],
      props: {
        'controller': PropertyInfo(
          name: 'controller',
          type: PropType.dynamic,
          description: 'Controls the text being edited',
        ),
        'placeholder': PropertyInfo(
          name: 'placeholder',
          type: PropType.string,
          description: 'Placeholder text',
        ),
      },
    ),

    // ========================================================================
    // LAYOUT WIDGETS (Beta)
    // ========================================================================
    'Stack': JSWidgetInfo(
      jsClass: 'Stack',
      file: 'widgets/stack.js',
      stability: WidgetStability.beta,
      version: VersionInfo(
        version: '0.9.0',
        minFlutterVersion: '2.5.0',
        minJSVersion: 'ES6',
      ),
      description: 'A widget that positions children relative to edges',
      limitations: [
        'z-index layering may differ from Flutter',
        'Performance with many children not optimized',
      ],
      props: {
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'The widgets to stack',
        ),
      },
    ),

    // ========================================================================
    // DEPRECATED WIDGETS
    // ========================================================================
    'FlatButton': JSWidgetInfo(
      jsClass: 'FlatButton',
      file: 'widgets/deprecated/flatbutton.js',
      stability: WidgetStability.deprecated,
      version: VersionInfo(
        version: '0.1.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
      ),
      description: '[DEPRECATED] A flat button widget',
      alternatives: ['TextButton', 'ElevatedButton'],
      conversionNotes:
          'Use TextButton for flat buttons or ElevatedButton for raised buttons',
      props: {},
    ),

    // ========================================================================
    // EXPERIMENTAL WIDGETS (Alpha)
    // ========================================================================
    'AnimatedContainer': JSWidgetInfo(
      jsClass: 'AnimatedContainer',
      file: 'widgets/animated/animated_container.js',
      stability: WidgetStability.alpha,
      version: VersionInfo(
        version: '0.5.0',
        minFlutterVersion: '3.0.0',
        minJSVersion: 'ES2020',
      ),
      description: '[EXPERIMENTAL] A container that animates its properties',
      limitations: [
        'Animation timing may differ from Flutter',
        'Nested animations not fully tested',
        'Performance on low-end devices not optimized',
      ],
      hasCustomConverter: true,
      conversionNotes: 'Requires custom animation handler',
      props: {
        'duration': PropertyInfo(
          name: 'duration',
          type: PropType.duration,
          isRequired: true,
          description: 'Duration of animation',
        ),
        'curve': PropertyInfo(
          name: 'curve',
          type: PropType.curve,
          defaultValue: 'linear',
          description: 'Animation curve',
        ),
      },
    ),

    // ========================================================================
    // DEVELOPMENT-ONLY WIDGETS
    // ========================================================================
    'DebugWidget': JSWidgetInfo(
      jsClass: 'DebugWidget',
      file: 'widgets/dev/debug.js',
      stability: WidgetStability.dev,
      version: VersionInfo(
        version: '0.0.1',
        minFlutterVersion: '3.0.0',
        minJSVersion: 'ES6',
      ),
      description: '[DEV-ONLY] Debug widget for development',
      limitations: [
        'Not for production use',
        'API may change without notice',
        'Performance not optimized',
      ],
      alternatives: ['Use Container for production'],
      props: {},
    ),
  };

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Get widget info by Dart name
  static JSWidgetInfo? getWidget(String dartName) {
    return dartToJSWidgets[dartName];
  }

  /// Check if widget is registered
  static bool isKnownWidget(String dartName) {
    return dartToJSWidgets.containsKey(dartName);
  }

  /// Check if widget is available for use
  static bool isAvailable(String dartName) {
    final widget = getWidget(dartName);
    if (widget == null) return false;

    // Not available if deprecated or dev-only
    return widget.stability != WidgetStability.deprecated &&
        widget.stability != WidgetStability.dev;
  }

  /// Check if widget is production-ready
  static bool isProductionReady(String dartName) {
    final widget = getWidget(dartName);
    return widget?.isProductionReady ?? false;
  }

  /// Get all widgets by stability
  static Map<String, JSWidgetInfo> getWidgetsByStability(
    WidgetStability stability,
  ) {
    return Map.fromEntries(
      dartToJSWidgets.entries.where((e) => e.value.stability == stability),
    );
  }

  /// Get stability status
  static WidgetStability? getStability(String dartName) {
    return getWidget(dartName)?.stability;
  }

  /// Get deprecation warning if applicable
  static String? getDeprecationWarning(String dartName) {
    return getWidget(dartName)?.getDeprecationWarning();
  }

  /// Get list of stable widgets
  static List<String> getStableWidgets() {
    return dartToJSWidgets.entries
        .where((e) => e.value.stability == WidgetStability.stable)
        .map((e) => e.key)
        .toList();
  }

  /// Get list of deprecated widgets
  static List<String> getDeprecatedWidgets() {
    return dartToJSWidgets.entries
        .where((e) => e.value.stability == WidgetStability.deprecated)
        .map((e) => e.key)
        .toList();
  }

  /// Generate widget support report
  static String generateSupportReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║     FLUTTER WIDGET SUPPORT REPORT                  ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    for (final status in WidgetStability.values) {
      final widgets = getWidgetsByStability(status);
      if (widgets.isEmpty) continue;

      buffer.writeln('${status.name.toUpperCase()} (${widgets.length}):');
      for (final entry in widgets.entries) {
        final widget = entry.value;
        final icon = _getStabilityIcon(status);
        buffer.writeln('  $icon ${entry.key} - ${widget.version}');

        if (widget.isDeprecated && widget.alternatives.isNotEmpty) {
          buffer.writeln(
            '     → Use instead: ${widget.alternatives.join(", ")}',
          );
        }

        if (widget.limitations.isNotEmpty) {
          buffer.writeln('     ⚠️  Limitations: ${widget.limitations.first}');
        }
      }
      buffer.writeln();
    }

    return buffer.toString();
  }

  /// Get stability icon
  static String _getStabilityIcon(WidgetStability status) {
    switch (status) {
      case WidgetStability.stable:
        return '✅';
      case WidgetStability.beta:
        return '🟡';
      case WidgetStability.alpha:
        return '🟠';
      case WidgetStability.dev:
        return '🔴';
      case WidgetStability.deprecated:
        return '⛔';
    }
  }
}
