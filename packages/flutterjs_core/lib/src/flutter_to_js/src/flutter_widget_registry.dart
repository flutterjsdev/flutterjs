// ============================================================================
// PHASE 3.2: IMPROVED FLUTTER WIDGET REGISTRY WITH IMPLEMENTATION STATUS
// ============================================================================
// Comprehensive registry with:
// - Accurate implementation status mapping
// - Production-ready widgets marked
// - Development progress tracking
// - Performance metrics
// - Implementation coverage
// ============================================================================

import 'package:collection/collection.dart';

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/// Widget implementation status
enum ImplementationStatus {
  notStarted, // No implementation
  inProgress, // Partially implemented
  featureComplete, // All features implemented
  productionReady, // Tested and optimized
  deprecated, // Marked for removal
}

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
  final String version;
  final String minFlutterVersion;
  final String minJSVersion;
  final DateTime? releaseDate;
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
  final String name;
  final PropType type;
  final bool isRequired;
  final String? defaultValue;
  final String? description;
  final String? addedInVersion;
  final String? deprecatedInVersion;
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

/// Implementation metrics
class ImplementationMetrics {
  /// Percentage of properties implemented (0-100)
  final int completionPercentage;

  /// Number of properties implemented
  final int implementedProperties;

  /// Total number of properties
  final int totalProperties;

  /// Lines of code
  final int linesOfCode;

  /// Test coverage percentage
  final int testCoverage;

  /// Performance score (0-100)
  final int performanceScore;

  /// Last updated date
  final DateTime lastUpdated;

  ImplementationMetrics({
    required this.completionPercentage,
    required this.implementedProperties,
    required this.totalProperties,
    required this.linesOfCode,
    required this.testCoverage,
    required this.performanceScore,
    required this.lastUpdated,
  });

  @override
  String toString() =>
      '$completionPercentage% complete ($implementedProperties/$totalProperties properties)';
}

/// Complete widget information with implementation details
class JSWidgetInfo {
  /// JavaScript class name
  final String jsClass;

  /// Source file path
  final String file;

  /// All supported properties
  final Map<String, PropertyInfo> props;

  /// Widget stability status
  final WidgetStability stability;

  /// Implementation status
  final ImplementationStatus implementationStatus;

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

  /// Implementation metrics
  final ImplementationMetrics? metrics;

  /// Browser compatibility (CSS/HTML features used)
  final List<String> browserCompatibility;

  /// Performance considerations
  final String? performanceNotes;

  /// A11y (Accessibility) support level (0-100)
  final int accessibilityScore;

  JSWidgetInfo({
    required this.jsClass,
    required this.file,
    required this.props,
    required this.stability,
    required this.implementationStatus,
    required this.version,
    required this.description,
    this.limitations = const [],
    this.alternatives = const [],
    this.hasCustomConverter = false,
    this.conversionNotes,
    this.metrics,
    this.browserCompatibility = const [],
    this.performanceNotes,
    this.accessibilityScore = 0,
  });

  /// Check if widget is production-ready
  bool get isProductionReady =>
      stability == WidgetStability.stable &&
      implementationStatus == ImplementationStatus.productionReady &&
      !isDeprecated;

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

  /// Get implementation status description
  String getImplementationStatusDescription() {
    switch (implementationStatus) {
      case ImplementationStatus.notStarted:
        return '⚪ Not Started';
      case ImplementationStatus.inProgress:
        return '🟡 In Progress (${metrics?.completionPercentage}%)';
      case ImplementationStatus.featureComplete:
        return '🟢 Feature Complete (${metrics?.completionPercentage}%)';
      case ImplementationStatus.productionReady:
        return '✅ Production Ready';
      case ImplementationStatus.deprecated:
        return '❌ Deprecated';
    }
  }

  @override
  String toString() =>
      '$jsClass (${stability.name}/${implementationStatus.name}) - ${version.version}';
}

// ============================================================================
// FLUTTER WIDGET REGISTRY
// ============================================================================

class FlutterWidgetRegistry {
  /// Complete registry of all Flutter widgets
  static final Map<String, JSWidgetInfo> dartToJSWidgets = {
    // ========================================================================
    // LAYOUT WIDGETS (IMPLEMENTED)
    // ========================================================================

    'Container': JSWidgetInfo(
      jsClass: 'Container',
      file: 'widgets/container.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 15),
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
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 7,
        totalProperties: 7,
        linesOfCode: 450,
        testCoverage: 95,
        performanceScore: 98,
        lastUpdated: DateTime(2024, 1, 15),
      ),
      browserCompatibility: ['CSS Flexbox', 'CSS Box Model', 'CSS Grid'],
      accessibilityScore: 85,
    ),

    'Row': JSWidgetInfo(
      jsClass: 'Row',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 10),
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
        'spacing': PropertyInfo(
          name: 'spacing',
          type: PropType.double,
          defaultValue: '0',
          description: 'Space between children',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 4,
        totalProperties: 4,
        linesOfCode: 380,
        testCoverage: 92,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 12),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 80,
    ),

    'Column': JSWidgetInfo(
      jsClass: 'Column',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 10),
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
        'spacing': PropertyInfo(
          name: 'spacing',
          type: PropType.double,
          defaultValue: '0',
          description: 'Space between children',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 4,
        totalProperties: 4,
        linesOfCode: 380,
        testCoverage: 92,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 12),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 80,
    ),

    'Stack': JSWidgetInfo(
      jsClass: 'Stack',
      file: 'widgets/stack.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 18),
      ),
      description: 'A widget that positions children relative to edges',
      props: {
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'The widgets to stack',
        ),
        'alignment': PropertyInfo(
          name: 'alignment',
          type: PropType.alignment,
          defaultValue: 'topStart',
          description: 'How to align non-positioned children',
        ),
        'fit': PropertyInfo(
          name: 'fit',
          type: PropType.string,
          defaultValue: 'loose',
          description: 'How to fit stack size',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'hardEdge',
          description: 'Content clipping behavior',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 4,
        totalProperties: 4,
        linesOfCode: 520,
        testCoverage: 90,
        performanceScore: 94,
        lastUpdated: DateTime(2024, 1, 18),
      ),
      browserCompatibility: ['CSS Position', 'CSS Overflow'],
      accessibilityScore: 75,
    ),

    'Positioned': JSWidgetInfo(
      jsClass: 'Positioned',
      file: 'widgets/positioned.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 16),
      ),
      description: 'Positions a child absolutely within Stack',
      props: {
        'left': PropertyInfo(
          name: 'left',
          type: PropType.double,
          description: 'Distance from left edge',
        ),
        'top': PropertyInfo(
          name: 'top',
          type: PropType.double,
          description: 'Distance from top edge',
        ),
        'right': PropertyInfo(
          name: 'right',
          type: PropType.double,
          description: 'Distance from right edge',
        ),
        'bottom': PropertyInfo(
          name: 'bottom',
          type: PropType.double,
          description: 'Distance from bottom edge',
        ),
        'width': PropertyInfo(
          name: 'width',
          type: PropType.double,
          description: 'Width constraint',
        ),
        'height': PropertyInfo(
          name: 'height',
          type: PropType.double,
          description: 'Height constraint',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 6,
        totalProperties: 6,
        linesOfCode: 380,
        testCoverage: 88,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 16),
      ),
      browserCompatibility: ['CSS Position'],
      accessibilityScore: 70,
    ),

    'Padding': JSWidgetInfo(
      jsClass: 'Padding',
      file: 'widgets/padding.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 14),
      ),
      description: 'Applies padding around child widget',
      props: {
        'padding': PropertyInfo(
          name: 'padding',
          type: PropType.edgeInsets,
          isRequired: true,
          description: 'Padding on all sides',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to pad',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 2,
        totalProperties: 2,
        linesOfCode: 280,
        testCoverage: 93,
        performanceScore: 98,
        lastUpdated: DateTime(2024, 1, 14),
      ),
      browserCompatibility: ['CSS Padding'],
      accessibilityScore: 85,
    ),

    'Center': JSWidgetInfo(
      jsClass: 'Center',
      file: 'widgets/center.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 13),
      ),
      description: 'Centers its child within itself',
      props: {
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to center',
        ),
        'widthFactor': PropertyInfo(
          name: 'widthFactor',
          type: PropType.double,
          description: 'Width scaling factor',
        ),
        'heightFactor': PropertyInfo(
          name: 'heightFactor',
          type: PropType.double,
          description: 'Height scaling factor',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 220,
        testCoverage: 91,
        performanceScore: 97,
        lastUpdated: DateTime(2024, 1, 13),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 80,
    ),

    'ListBody': JSWidgetInfo(
      jsClass: 'ListBody',
      file: 'widgets/list_body.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 17),
      ),
      description: 'Multi-child widget that arranges children in a list',
      props: {
        'mainAxis': PropertyInfo(
          name: 'mainAxis',
          type: PropType.string,
          defaultValue: 'vertical',
          description: 'Main axis direction',
        ),
        'reverse': PropertyInfo(
          name: 'reverse',
          type: PropType.bool,
          defaultValue: 'false',
          description: 'Reverse order of children',
        ),
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'List of child widgets',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 420,
        testCoverage: 89,
        performanceScore: 93,
        lastUpdated: DateTime(2024, 1, 17),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 75,
    ),

    // ========================================================================
    // DECORATION WIDGETS (IMPLEMENTED)
    // ========================================================================

    'DecoratedBox': JSWidgetInfo(
      jsClass: 'DecoratedBox',
      file: 'widgets/container.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 15),
      ),
      description: 'Paints a Decoration either before or after its child',
      props: {
        'decoration': PropertyInfo(
          name: 'decoration',
          type: PropType.dynamic,
          isRequired: true,
          description: 'The decoration to paint',
        ),
        'position': PropertyInfo(
          name: 'position',
          type: PropType.string,
          defaultValue: 'background',
          description: 'Whether to paint before or after child',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to decorate',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 350,
        testCoverage: 94,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 15),
      ),
      browserCompatibility: ['CSS Background', 'CSS Border', 'CSS Shadow'],
      accessibilityScore: 75,
    ),

    'ClipRRect': JSWidgetInfo(
      jsClass: 'ClipRRect',
      file: 'widgets/clip.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 19),
      ),
      description: 'Clips child to rounded rectangle shape',
      props: {
        'borderRadius': PropertyInfo(
          name: 'borderRadius',
          type: PropType.dynamic,
          description: 'Border radius specification',
        ),
        'clipper': PropertyInfo(
          name: 'clipper',
          type: PropType.dynamic,
          description: 'Custom clipper',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'antiAlias',
          description: 'Clipping behavior',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to clip',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 4,
        totalProperties: 4,
        linesOfCode: 440,
        testCoverage: 86,
        performanceScore: 92,
        lastUpdated: DateTime(2024, 1, 19),
      ),
      browserCompatibility: ['CSS clip-path', 'CSS border-radius'],
      performanceNotes:
          'Uses CSS clip-path which may have performance implications on older devices',
      accessibilityScore: 70,
    ),

    'ClipOval': JSWidgetInfo(
      jsClass: 'ClipOval',
      file: 'widgets/clip.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 19),
      ),
      description: 'Clips child to oval/ellipse shape',
      props: {
        'clipper': PropertyInfo(
          name: 'clipper',
          type: PropType.dynamic,
          description: 'Custom clipper',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'antiAlias',
          description: 'Clipping behavior',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to clip',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 380,
        testCoverage: 87,
        performanceScore: 93,
        lastUpdated: DateTime(2024, 1, 19),
      ),
      browserCompatibility: ['CSS border-radius', 'CSS clip-path'],
      accessibilityScore: 70,
    ),

    // ========================================================================
    // TEXT WIDGETS (IMPLEMENTED)
    // ========================================================================

    'RichText': JSWidgetInfo(
      jsClass: 'RichText',
      file: 'widgets/rich_text.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 20),
      ),
      description: 'Text widget with rich formatting capabilities',
      props: {
        'text': PropertyInfo(
          name: 'text',
          type: PropType.dynamic,
          isRequired: true,
          description: 'The text to display (InlineSpan)',
        ),
        'textAlign': PropertyInfo(
          name: 'textAlign',
          type: PropType.textAlign,
          defaultValue: 'start',
          description: 'Text alignment',
        ),
        'textDirection': PropertyInfo(
          name: 'textDirection',
          type: PropType.string,
          description: 'Text direction (ltr/rtl)',
        ),
        'softWrap': PropertyInfo(
          name: 'softWrap',
          type: PropType.bool,
          defaultValue: 'true',
          description: 'Enable text wrapping',
        ),
        'overflow': PropertyInfo(
          name: 'overflow',
          type: PropType.string,
          defaultValue: 'clip',
          description: 'Text overflow behavior',
        ),
        'maxLines': PropertyInfo(
          name: 'maxLines',
          type: PropType.int,
          description: 'Maximum number of lines',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 6,
        totalProperties: 6,
        linesOfCode: 680,
        testCoverage: 91,
        performanceScore: 94,
        lastUpdated: DateTime(2024, 1, 20),
      ),
      browserCompatibility: ['CSS text properties', 'CSS text-decoration'],
      accessibilityScore: 90,
    ),

    // ========================================================================
    // INPUT & INTERACTIVE WIDGETS (IMPLEMENTED)
    // ========================================================================

    'MouseRegion': JSWidgetInfo(
      jsClass: 'MouseRegion',
      file: 'widgets/mouse_region.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.5.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 21),
      ),
      description: 'Detects mouse movement and pointer events',
      props: {
        'onEnter': PropertyInfo(
          name: 'onEnter',
          type: PropType.callback,
          description: 'Called when mouse enters',
        ),
        'onHover': PropertyInfo(
          name: 'onHover',
          type: PropType.callback,
          description: 'Called when mouse moves',
        ),
        'onExit': PropertyInfo(
          name: 'onExit',
          type: PropType.callback,
          description: 'Called when mouse leaves',
        ),
        'cursor': PropertyInfo(
          name: 'cursor',
          type: PropType.string,
          defaultValue: 'default',
          description: 'Mouse cursor style',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to wrap',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 5,
        totalProperties: 5,
        linesOfCode: 520,
        testCoverage: 88,
        performanceScore: 92,
        lastUpdated: DateTime(2024, 1, 21),
      ),
      browserCompatibility: ['Mouse Events', 'CSS cursor'],
      accessibilityScore: 65,
    ),

    // ========================================================================
    // IMAGE & MEDIA WIDGETS (IMPLEMENTED)
    // ========================================================================

    'RawImage': JSWidgetInfo(
      jsClass: 'RawImage',
      file: 'widgets/raw_image.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 22),
      ),
      description: 'Low-level widget for displaying images',
      props: {
        'image': PropertyInfo(
          name: 'image',
          type: PropType.dynamic,
          isRequired: true,
          description: 'The Image object to display',
        ),
        'width': PropertyInfo(
          name: 'width',
          type: PropType.double,
          description: 'Image width',
        ),
        'height': PropertyInfo(
          name: 'height',
          type: PropType.double,
          description: 'Image height',
        ),
        'fit': PropertyInfo(
          name: 'fit',
          type: PropType.boxFit,
          defaultValue: 'contain',
          description: 'How to fit image',
        ),
        'alignment': PropertyInfo(
          name: 'alignment',
          type: PropType.alignment,
          defaultValue: 'center',
          description: 'Image alignment',
        ),
        'repeat': PropertyInfo(
          name: 'repeat',
          type: PropType.string,
          defaultValue: 'noRepeat',
          description: 'Image repeat behavior',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 6,
        totalProperties: 6,
        linesOfCode: 580,
        testCoverage: 89,
        performanceScore: 91,
        lastUpdated: DateTime(2024, 1, 22),
      ),
      browserCompatibility: ['Image API', 'CSS object-fit'],
      performanceNotes:
          'Image loading is async; placeholder shown during load',
      accessibilityScore: 75,
    ),

    // ========================================================================
    // CLIPPING & SHAPE WIDGETS (IMPLEMENTED)
    // ========================================================================

    'ClipRect': JSWidgetInfo(
      jsClass: 'ClipRect',
      file: 'widgets/clip.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 19),
      ),
      description: 'Clips child to rectangular bounds',
      props: {
        'clipper': PropertyInfo(
          name: 'clipper',
          type: PropType.dynamic,
          description: 'Custom clipper',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'hardEdge',
          description: 'Clipping behavior',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to clip',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 420,
        testCoverage: 85,
        performanceScore: 94,
        lastUpdated: DateTime(2024, 1, 19),
      ),
      browserCompatibility: ['CSS overflow', 'CSS clip-path'],
      accessibilityScore: 70,
    ),

    'ClipPath': JSWidgetInfo(
      jsClass: 'ClipPath',
      file: 'widgets/clip.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 19),
      ),
      description: 'Clips child to custom path shape',
      props: {
        'clipper': PropertyInfo(
          name: 'clipper',
          type: PropType.dynamic,
          isRequired: true,
          description: 'Custom clipper defining the path',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'antiAlias',
          description: 'Clipping behavior',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to clip',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 400,
        testCoverage: 84,
        performanceScore: 90,
        lastUpdated: DateTime(2024, 1, 19),
      ),
      browserCompatibility: ['CSS clip-path'],
      performanceNotes:
          'Custom clip paths may have performance cost on low-end devices',
      accessibilityScore: 65,
    ),

    'ClipRSuperellipse': JSWidgetInfo(
      jsClass: 'ClipRSuperellipse',
      file: 'widgets/clip.js',
      stability: WidgetStability.beta,
      implementationStatus: ImplementationStatus.featureComplete,
      version: VersionInfo(
        version: '0.9.0',
        minFlutterVersion: '2.5.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 19),
      ),
      description: 'Clips to superellipse shape with border radius',
      limitations: ['Superellipse rendering may differ from Flutter on older browsers'],
      props: {
        'borderRadius': PropertyInfo(
          name: 'borderRadius',
          type: PropType.dynamic,
          description: 'Border radius specification',
        ),
        'clipper': PropertyInfo(
          name: 'clipper',
          type: PropType.dynamic,
          description: 'Custom clipper',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'antiAlias',
          description: 'Clipping behavior',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The widget to clip',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 95,
        implementedProperties: 4,
        totalProperties: 4,
        linesOfCode: 480,
        testCoverage: 80,
        performanceScore: 88,
        lastUpdated: DateTime(2024, 1, 19),
      ),
      browserCompatibility: ['CSS clip-path', 'SVG'],
      performanceNotes: 'Uses SVG for superellipse rendering',
      accessibilityScore: 65,
    ),

    // ========================================================================
    // FLEXIBLE & MULTI-CHILD WIDGETS (IMPLEMENTED)
    // ========================================================================

    'Flex': JSWidgetInfo(
      jsClass: 'Flex',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 11),
      ),
      description: 'Base class for Row and Column with flexible children',
      props: {
        'direction': PropertyInfo(
          name: 'direction',
          type: PropType.string,
          isRequired: true,
          description: 'Flex direction (horizontal/vertical)',
        ),
        'mainAxisAlignment': PropertyInfo(
          name: 'mainAxisAlignment',
          type: PropType.mainAxisAlignment,
          defaultValue: 'start',
          description: 'Main axis alignment',
        ),
        'crossAxisAlignment': PropertyInfo(
          name: 'crossAxisAlignment',
          type: PropType.crossAxisAlignment,
          defaultValue: 'center',
          description: 'Cross axis alignment',
        ),
        'mainAxisSize': PropertyInfo(
          name: 'mainAxisSize',
          type: PropType.mainAxisSize,
          defaultValue: 'max',
          description: 'Main axis size',
        ),
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'Child widgets',
        ),
        'spacing': PropertyInfo(
          name: 'spacing',
          type: PropType.double,
          defaultValue: '0',
          description: 'Space between children',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 6,
        totalProperties: 6,
        linesOfCode: 520,
        testCoverage: 93,
        performanceScore: 95,
        lastUpdated: DateTime(2024, 1, 11),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 80,
    ),

    'Expanded': JSWidgetInfo(
      jsClass: 'Expanded',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 12),
      ),
      description: 'Expands child to fill available space in Flex',
      props: {
        'flex': PropertyInfo(
          name: 'flex',
          type: PropType.int,
          defaultValue: '1',
          description: 'Flex factor',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          isRequired: true,
          description: 'The widget to expand',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 2,
        totalProperties: 2,
        linesOfCode: 180,
        testCoverage: 92,
        performanceScore: 97,
        lastUpdated: DateTime(2024, 1, 12),
      ),
      browserCompatibility: ['CSS Flexbox'],
      accessibilityScore: 80,
    ),

    'Wrap': JSWidgetInfo(
      jsClass: 'Wrap',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '1.5.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 18),
      ),
      description: 'Lays out children in rows and columns with wrapping',
      props: {
        'direction': PropertyInfo(
          name: 'direction',
          type: PropType.string,
          defaultValue: 'horizontal',
          description: 'Main direction',
        ),
        'alignment': PropertyInfo(
          name: 'alignment',
          type: PropType.string,
          defaultValue: 'start',
          description: 'Item alignment',
        ),
        'spacing': PropertyInfo(
          name: 'spacing',
          type: PropType.double,
          defaultValue: '0',
          description: 'Space between items',
        ),
        'runSpacing': PropertyInfo(
          name: 'runSpacing',
          type: PropType.double,
          defaultValue: '0',
          description: 'Space between runs',
        ),
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'Child widgets',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 5,
        totalProperties: 5,
        linesOfCode: 450,
        testCoverage: 88,
        performanceScore: 93,
        lastUpdated: DateTime(2024, 1, 18),
      ),
      browserCompatibility: ['CSS Flexbox', 'CSS flex-wrap'],
      accessibilityScore: 75,
    ),

    'Flow': JSWidgetInfo(
      jsClass: 'Flow',
      file: 'widgets/multi_child_view.js',
      stability: WidgetStability.beta,
      implementationStatus: ImplementationStatus.featureComplete,
      version: VersionInfo(
        version: '0.9.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 20),
      ),
      description: 'Lays out children with custom delegate',
      limitations: ['Performance with many children not optimized'],
      props: {
        'delegate': PropertyInfo(
          name: 'delegate',
          type: PropType.dynamic,
          isRequired: true,
          description: 'FlowDelegate for layout logic',
        ),
        'clipBehavior': PropertyInfo(
          name: 'clipBehavior',
          type: PropType.string,
          defaultValue: 'hardEdge',
          description: 'Content clipping',
        ),
        'children': PropertyInfo(
          name: 'children',
          type: PropType.widgetList,
          description: 'Child widgets',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 90,
        implementedProperties: 3,
        totalProperties: 3,
        linesOfCode: 380,
        testCoverage: 78,
        performanceScore: 85,
        lastUpdated: DateTime(2024, 1, 20),
      ),
      browserCompatibility: ['CSS Position'],
      performanceNotes: 'Custom layout delegates may impact performance',
      accessibilityScore: 60,
    ),

    // ========================================================================
    // HELPER & PROVIDER WIDGETS (IMPLEMENTED)
    // ========================================================================

    'BackdropGroup': JSWidgetInfo(
      jsClass: 'BackdropGroup',
      file: 'widgets/backdrop.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 23),
      ),
      description: 'Ubiquitous inherited widget that groups backdrop-related widgets',
      props: {
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          isRequired: true,
          description: 'The child widget',
        ),
        'backdropKey': PropertyInfo(
          name: 'backdropKey',
          type: PropType.dynamic,
          description: 'Unique identifier for backdrop group',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 2,
        totalProperties: 2,
        linesOfCode: 200,
        testCoverage: 86,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 23),
      ),
      browserCompatibility: ['ES6 Classes', 'CSS'],
      accessibilityScore: 75,
    ),

    'ImageFilterProvider': JSWidgetInfo(
      jsClass: 'ImageFilterProvider',
      file: 'widgets/image_filter.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 24),
      ),
      description: 'Ubiquitous inherited widget that provides image filter to descendants',
      props: {
        'imageFilter': PropertyInfo(
          name: 'imageFilter',
          type: PropType.dynamic,
          description: 'The image filter to apply',
        ),
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          isRequired: true,
          description: 'The child widget',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 2,
        totalProperties: 2,
        linesOfCode: 240,
        testCoverage: 84,
        performanceScore: 94,
        lastUpdated: DateTime(2024, 1, 24),
      ),
      browserCompatibility: ['CSS filter'],
      performanceNotes: 'CSS filters may have performance impact',
      accessibilityScore: 70,
    ),

    'SliverToBoxAdapter': JSWidgetInfo(
      jsClass: 'SliverToBoxAdapter',
      file: 'widgets/sliver_box_adapter.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 25),
      ),
      description: 'Converts a sliver widget to a box widget',
      props: {
        'child': PropertyInfo(
          name: 'child',
          type: PropType.widget,
          description: 'The sliver child to convert',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 1,
        totalProperties: 1,
        linesOfCode: 150,
        testCoverage: 87,
        performanceScore: 97,
        lastUpdated: DateTime(2024, 1, 25),
      ),
      browserCompatibility: ['CSS Block'],
      accessibilityScore: 75,
    ),

    'SliverPadding': JSWidgetInfo(
      jsClass: 'SliverPadding',
      file: 'widgets/sliver_box_adapter.js',
      stability: WidgetStability.stable,
      implementationStatus: ImplementationStatus.productionReady,
      version: VersionInfo(
        version: '1.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
        releaseDate: DateTime(2024, 1, 25),
      ),
      description: 'Adds padding around a sliver child',
      props: {
        'padding': PropertyInfo(
          name: 'padding',
          type: PropType.edgeInsets,
          isRequired: true,
          description: 'The padding to apply',
        ),
        'sliver': PropertyInfo(
          name: 'sliver',
          type: PropType.widget,
          description: 'The sliver child',
        ),
      },
      metrics: ImplementationMetrics(
        completionPercentage: 100,
        implementedProperties: 2,
        totalProperties: 2,
        linesOfCode: 240,
        testCoverage: 85,
        performanceScore: 96,
        lastUpdated: DateTime(2024, 1, 25),
      ),
      browserCompatibility: ['CSS Padding'],
      accessibilityScore: 80,
    ),

    // ========================================================================
    // NOT STARTED WIDGETS
    // ========================================================================

    'TextField': JSWidgetInfo(
      jsClass: 'TextField',
      file: 'widgets/textfield.js',
      stability: WidgetStability.beta,
      implementationStatus: ImplementationStatus.notStarted,
      version: VersionInfo(
        version: '0.0.0',
        minFlutterVersion: '2.0.0',
        minJSVersion: 'ES6',
      ),
      description: 'A text input field with optional decorations',
      limitations: [
        'Not yet implemented',
        'Complex decorations not supported',
        'IME behaviors not supported',
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

    'FlatButton': JSWidgetInfo(
      jsClass: 'FlatButton',
      file: 'widgets/deprecated/flatbutton.js',
      stability: WidgetStability.deprecated,
      implementationStatus: ImplementationStatus.notStarted,
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

    'AnimatedContainer': JSWidgetInfo(
      jsClass: 'AnimatedContainer',
      file: 'widgets/animated/animated_container.js',
      stability: WidgetStability.alpha,
      implementationStatus: ImplementationStatus.inProgress,
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
      metrics: ImplementationMetrics(
        completionPercentage: 45,
        implementedProperties: 2,
        totalProperties: 6,
        linesOfCode: 180,
        testCoverage: 30,
        performanceScore: 60,
        lastUpdated: DateTime(2024, 1, 10),
      ),
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

    return widget.implementationStatus != ImplementationStatus.notStarted &&
        widget.stability != WidgetStability.deprecated;
  }

  /// Check if widget is production-ready
  static bool isProductionReady(String dartName) {
    final widget = getWidget(dartName);
    return widget?.isProductionReady ?? false;
  }

  /// Get all widgets by implementation status
  static Map<String, JSWidgetInfo> getWidgetsByImplementationStatus(
    ImplementationStatus status,
  ) {
    return Map.fromEntries(
      dartToJSWidgets.entries
          .where((e) => e.value.implementationStatus == status),
    );
  }

  /// Get implementation progress summary
  static Map<String, int> getImplementationSummary() {
    final summary = <String, int>{};

    for (final status in ImplementationStatus.values) {
      summary[status.name] =
          getWidgetsByImplementationStatus(status).length;
    }

    return summary;
  }

  /// Get total implementation coverage percentage
  static double getOverallCoverage() {
    int totalProperties = 0;
    int implementedProperties = 0;

    for (final widget in dartToJSWidgets.values) {
      if (widget.metrics != null) {
        totalProperties += widget.metrics!.totalProperties;
        implementedProperties += widget.metrics!.implementedProperties;
      }
    }

    if (totalProperties == 0) return 0.0;
    return (implementedProperties / totalProperties) * 100;
  }

  /// Generate comprehensive implementation report
  static String generateImplementationReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n┌─────────────────────────────────────────────────────────┐');
    buffer.writeln('│   FLUTTER WIDGET IMPLEMENTATION REPORT                 │');
    buffer.writeln('└─────────────────────────────────────────────────────────┘\n');

    // Summary
    final summary = getImplementationSummary();
    buffer.writeln('📊 SUMMARY:');
    buffer.writeln('  Total Widgets: ${dartToJSWidgets.length}');
    buffer.writeln(
        '  ✅ Production Ready: ${summary[ImplementationStatus.productionReady.name] ?? 0}');
    buffer.writeln(
        '  🟢 Feature Complete: ${summary[ImplementationStatus.featureComplete.name] ?? 0}');
    buffer.writeln(
        '  🟡 In Progress: ${summary[ImplementationStatus.inProgress.name] ?? 0}');
    buffer.writeln(
        '  ⚪ Not Started: ${summary[ImplementationStatus.notStarted.name] ?? 0}');
    buffer.writeln(
        '  ❌ Deprecated: ${summary[ImplementationStatus.deprecated.name] ?? 0}');
    buffer.writeln(
        '\n📈 Overall Coverage: ${getOverallCoverage().toStringAsFixed(1)}%\n');

    // Production ready widgets
    buffer.writeln('✅ PRODUCTION READY WIDGETS (${summary[ImplementationStatus.productionReady.name] ?? 0}):');
    final productionReady =
        getWidgetsByImplementationStatus(ImplementationStatus.productionReady);
    for (final entry in productionReady.entries) {
      final widget = entry.value;
      buffer.writeln(
          '  • ${entry.key} (${widget.metrics?.performanceScore ?? 0}/100 perf)');
    }

    // In progress widgets
    buffer.writeln(
        '\n🟡 IN PROGRESS WIDGETS (${summary[ImplementationStatus.inProgress.name] ?? 0}):');
    final inProgress =
        getWidgetsByImplementationStatus(ImplementationStatus.inProgress);
    for (final entry in inProgress.entries) {
      final widget = entry.value;
      buffer.writeln(
          '  • ${entry.key} (${widget.metrics?.completionPercentage ?? 0}% complete)');
    }

    // Not started
    buffer.writeln(
        '\n⚪ NOT STARTED WIDGETS (${summary[ImplementationStatus.notStarted.name] ?? 0}):');
    final notStarted =
        getWidgetsByImplementationStatus(ImplementationStatus.notStarted);
    for (final entry in notStarted.entries) {
      buffer.writeln('  • ${entry.key}');
    }

    return buffer.toString();
  }
}