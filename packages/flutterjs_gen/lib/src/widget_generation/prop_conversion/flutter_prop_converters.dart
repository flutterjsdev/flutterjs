// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// PHASE 3.6: FLUTTER PROP CONVERTERS
// ============================================================================
// Maps Dart Flutter property expressions to JavaScript/CSS equivalents
// Handles all Flutter types: Colors, Alignment, EdgeInsets, TextStyle, etc.
// Works with StatefulWidget, StatelessWidget, and custom widgets
// ============================================================================

import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';

import 'package:flutterjs_core/flutterjs_core.dart';
import '../../code_generation/expression/expression_code_generator.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for property conversion
class PropConverterConfig {
  /// Whether to generate comments explaining conversions
  final bool generateConversionComments;

  /// Whether to validate property types
  final bool validateTypes;

  /// Whether to use FlutterJS framework helpers
  final bool useFrameworkHelpers;

  /// Default theme colors if not specified
  final Map<String, String> defaultThemeColors;

  const PropConverterConfig({
    this.generateConversionComments = true,
    this.validateTypes = true,
    this.useFrameworkHelpers = true,
    this.defaultThemeColors = const {
      'primary': '#6750A4',
      'onPrimary': '#FFFFFF',
      'secondary': '#625B71',
      'onSecondary': '#FFFFFF',
      'surface': '#FFFBFE',
      'onSurface': '#1C1B1F',
      'error': '#B3261E',
      'onError': '#FFFFFF',
    },
  });
}

// ============================================================================
// CONVERSION RESULT
// ============================================================================

class ConversionResult {
  /// The converted JavaScript code
  final String code;

  /// Any warnings during conversion
  final List<String> warnings;

  /// Any errors during conversion
  final List<String> errors;

  /// Whether conversion was successful
  final bool isSuccessful;

  /// Original Dart type that was converted
  final String dartType;

  ConversionResult({
    required this.code,
    this.warnings = const [],
    this.errors = const [],
    this.isSuccessful = true,
    required this.dartType,
  });

  @override
  String toString() =>
      'ConversionResult($dartType -> $code, errors: ${errors.length})';
}

// ============================================================================
// MAIN PROP CONVERTER
// ============================================================================

class FlutterPropConverter {
  final PropConverterConfig config;
  final ExpressionCodeGen exprGen;

  final List<String> conversionLog = [];

  FlutterPropConverter({
    PropConverterConfig? config,
    ExpressionCodeGen? exprGen,
  }) : config = config ?? const PropConverterConfig(),
       exprGen = exprGen ?? ExpressionCodeGen();

  // =========================================================================
  // PUBLIC API - MAIN CONVERSION DISPATCH
  // =========================================================================

  /// Convert any Flutter property to JavaScript
  ConversionResult convertProperty(
    String propertyName,
    ExpressionIR expr,
    String? expectedType,
  ) {
    try {
      final result = switch (expectedType) {
        // Colors
        'Color' || 'color' => convertColor(expr),

        // Alignment & Position
        'Alignment' => convertAlignment(expr),
        'AlignmentGeometry' => convertAlignmentGeometry(expr),

        // Padding & Margins
        'EdgeInsets' => convertEdgeInsets(expr),
        'EdgeInsetsGeometry' => convertEdgeInsetsGeometry(expr),

        // Typography
        'TextStyle' => convertTextStyle(expr),
        'TextAlign' => convertTextAlign(expr),
        'TextDirection' => convertTextDirection(expr),

        // Layout
        'MainAxisAlignment' => convertMainAxisAlignment(expr),
        'CrossAxisAlignment' => convertCrossAxisAlignment(expr),
        'MainAxisSize' => convertMainAxisSize(expr),
        'CrossAxisSize' => convertCrossAxisSize(expr),

        // Sizing
        'BoxFit' => convertBoxFit(expr),
        'BoxConstraints' => convertBoxConstraints(expr),
        'Size' => convertSize(expr),

        // Styling
        'BoxDecoration' => convertBoxDecoration(expr),
        'Border' => convertBorder(expr),
        'BorderRadius' => convertBorderRadius(expr),
        'BorderSide' => convertBorderSide(expr),

        // Shadows & Effects
        'BoxShadow' => convertBoxShadow(expr),
        'Shadow' => convertShadow(expr),

        // Animation
        'Duration' => convertDuration(expr),
        'Curve' => convertCurve(expr),

        // Offset & Transform
        'Offset' => convertOffset(expr),
        'Matrix4' => convertMatrix4(expr),

        // Icons & Decorations
        'IconData' => convertIconData(expr),
        'DecorationImage' => convertDecorationImage(expr),

        // Other common types
        'double' || 'num' => convertDouble(expr),
        'int' => convertInt(expr),
        'String' => convertString(expr),
        'bool' => convertBool(expr),
        'List' => convertList(expr),
        'Map' => convertMap(expr),

        // Fallback
        _ => _fallbackConversion(expr, expectedType),
      };

      return result;
    } catch (e) {
      return ConversionResult(
        code: '/* TODO: Conversion failed */',
        errors: ['Conversion error: $e'],
        isSuccessful: false,
        dartType: expectedType ?? 'unknown',
      );
    }
  }

  // =========================================================================
  // COLOR CONVERSION
  // =========================================================================

  ConversionResult convertColor(ExpressionIR expr) {
    // Colors.blue -> '#2196F3'
    // Colors.red[400] -> '#EF5350'
    // Color(0xFFFF0000) -> '#FF0000'

    if (expr is PropertyAccessExpressionIR) {
      final colorName = expr.propertyName.toLowerCase();
      final hexValue = _getMaterialColorHex(colorName);

      return ConversionResult(
        code: "'$hexValue'",
        dartType: 'Color',
        warnings: hexValue == '#000000'
            ? ['Unknown color: ${expr.propertyName}']
            : [],
      );
    }

    if (expr is IndexAccessExpressionIR) {
      // Colors.red[400]
      if (expr.target is PropertyAccessExpressionIR) {
        final baseColor =
            (expr.target as PropertyAccessExpressionIR).propertyName;
        final shade = exprGen.generate(expr.index, parenthesize: false);

        return ConversionResult(
          code: "_getColorShade('${baseColor.toLowerCase()}', $shade)",
          dartType: 'Color',
        );
      }
    }

    if (expr is LiteralExpressionIR) {
      if (expr.literalType == LiteralType.intValue) {
        // 0xFFFF0000
        final intVal = expr.value as int;
        final hexStr = _intToHex(intVal);
        return ConversionResult(code: "'$hexStr'", dartType: 'Color');
      }
    }

    if (expr is MethodCallExpressionIR) {
      // Color.fromARGB(255, 255, 0, 0)
      if (expr.methodName == 'fromARGB' || expr.methodName == 'fromRGBO') {
        final args = expr.arguments.map((a) {
          if (a is LiteralExpressionIR) {
            return a.value.toString();
          }
          return exprGen.generate(a, parenthesize: false);
        }).toList();

        return ConversionResult(
          code: "new Color(Color.from${expr.methodName}(${args.join(', ')}))",
          dartType: 'Color',
        );
      }
    }

    // Fallback
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Color',
      warnings: ['Color conversion may be incomplete'],
    );
  }

  // =========================================================================
  // ALIGNMENT CONVERSION
  // =========================================================================

  ConversionResult convertAlignment(ExpressionIR expr) {
    // Alignment.center -> 'center'
    // Alignment.topLeft -> 'flex-start flex-start'
    // Alignment(0.5, 0.5) -> custom

    if (expr is PropertyAccessExpressionIR) {
      final alignName = expr.propertyName;
      final cssAlign = _alignmentToCss(alignName);

      return ConversionResult(code: "'$cssAlign'", dartType: 'Alignment');
    }

    if (expr is MethodCallExpressionIR) {
      if (expr.methodName == 'lerp') {
        return ConversionResult(
          code: 'Alignment.lerp(...)',
          dartType: 'Alignment',
          warnings: ['Alignment.lerp() requires runtime computation'],
        );
      }
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Alignment',
    );
  }

  ConversionResult convertAlignmentGeometry(ExpressionIR expr) {
    // Same as Alignment but more generic
    return convertAlignment(expr);
  }

  // =========================================================================
  // EDGE INSETS CONVERSION
  // =========================================================================

  ConversionResult convertEdgeInsets(ExpressionIR expr) {
    // EdgeInsets.all(16) -> {top: 16, right: 16, bottom: 16, left: 16}
    // EdgeInsets.symmetric(h: 8, v: 16) -> {top: 16, left: 8, ...}
    // EdgeInsets.only(top: 10, left: 5) -> {top: 10, left: 5, ...}

    if (expr is MethodCallExpressionIR) {
      final method = expr.methodName;

      if (method == 'all') {
        final value = _getArgumentValue(expr, 0);
        // FIX: Handle null value
        if (value != null) {
          return ConversionResult(
            code:
                "new EdgeInsets({top: $value, right: $value, bottom: $value, left: $value})",
            dartType: 'EdgeInsets',
          );
        }
      }

      if (method == 'symmetric') {
        final h = _getNamedArgumentValue(expr, 'horizontal') ?? '0';
        final v = _getNamedArgumentValue(expr, 'vertical') ?? '0';

        return ConversionResult(
          code: "new EdgeInsets({top: $v, right: $h, bottom: $v, left: $h})",
          dartType: 'EdgeInsets',
        );
      }

      if (method == 'only') {
        final top = _getNamedArgumentValue(expr, 'top') ?? '0';
        final right = _getNamedArgumentValue(expr, 'right') ?? '0';
        final bottom = _getNamedArgumentValue(expr, 'bottom') ?? '0';
        final left = _getNamedArgumentValue(expr, 'left') ?? '0';

        return ConversionResult(
          code:
              "new EdgeInsets({top: $top, right: $right, bottom: $bottom, left: $left})",
          dartType: 'EdgeInsets',
        );
      }
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'EdgeInsets',
    );
  }

  ConversionResult convertEdgeInsetsGeometry(ExpressionIR expr) {
    return convertEdgeInsets(expr);
  }

  // =========================================================================
  // TEXT STYLE CONVERSION
  // =========================================================================

  ConversionResult convertTextStyle(ExpressionIR expr) {
    // TextStyle(fontSize: 16, color: Colors.blue, fontWeight: FontWeight.bold)
    // -> {fontSize: 16, color: '#2196F3', fontWeight: 'bold'}

    if (expr is InstanceCreationExpressionIR) {
      final styleProps = <String, String>{};

      for (final entry in expr.namedArguments.entries) {
        final key = entry.key;
        final value = entry.value;

        switch (key) {
          case 'fontSize':
            styleProps['fontSize'] = exprGen.generate(
              value,
              parenthesize: false,
            );
            break;

          case 'fontWeight':
            styleProps['fontWeight'] = _convertFontWeight(value);
            break;

          case 'fontStyle':
            styleProps['fontStyle'] = _convertFontStyle(value);
            break;

          case 'color':
            final colorResult = convertColor(value);
            styleProps['color'] = colorResult.code;
            break;

          case 'decoration':
            styleProps['textDecoration'] = _convertTextDecoration(value);
            break;

          case 'decorationColor':
            final colorResult = convertColor(value);
            styleProps['textDecorationColor'] = colorResult.code;
            break;

          case 'letterSpacing':
            styleProps['letterSpacing'] = exprGen.generate(
              value,
              parenthesize: false,
            );
            break;

          case 'wordSpacing':
            styleProps['wordSpacing'] = exprGen.generate(
              value,
              parenthesize: false,
            );
            break;

          case 'height':
            styleProps['lineHeight'] = exprGen.generate(
              value,
              parenthesize: false,
            );
            break;

          default:
            styleProps[key] = exprGen.generate(value, parenthesize: false);
        }
      }

      final propsStr = styleProps.entries
          .map((e) => '${e.key}: ${e.value}')
          .join(', ');

      return ConversionResult(
        code: 'new TextStyle({$propsStr})',
        dartType: 'TextStyle',
      );
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'TextStyle',
    );
  }
  // =========================================================================
  // TEXT ALIGNMENT CONVERSION
  // =========================================================================

  ConversionResult convertTextAlign(ExpressionIR expr) {
    // TextAlign.center -> 'center'
    // TextAlign.left -> 'left'
    // TextAlign.right -> 'right'

    if (expr is PropertyAccessExpressionIR) {
      final alignName = expr.propertyName.toLowerCase();
      return ConversionResult(code: "'$alignName'", dartType: 'TextAlign');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'TextAlign',
    );
  }

  ConversionResult convertTextDirection(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      final dir = expr.propertyName.toLowerCase() == 'ltr' ? 'ltr' : 'rtl';
      return ConversionResult(code: "'$dir'", dartType: 'TextDirection');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'TextDirection',
    );
  }

  // =========================================================================
  // MAIN AXIS ALIGNMENT
  // =========================================================================

  ConversionResult convertMainAxisAlignment(ExpressionIR expr) {
    // MainAxisAlignment.start -> MainAxisAlignment.start
    // MainAxisAlignment.center -> MainAxisAlignment.center
    // Note: Keep Flutter-style enum syntax for familiarity

    if (expr is PropertyAccessExpressionIR) {
      final name = expr.propertyName;
      // Use Flutter-style enum syntax
      return ConversionResult(
        code: 'MainAxisAlignment.$name',
        dartType: 'MainAxisAlignment',
      );
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'MainAxisAlignment',
    );
  }

  // =========================================================================
  // CROSS AXIS ALIGNMENT
  // =========================================================================

  ConversionResult convertCrossAxisAlignment(ExpressionIR expr) {
    // CrossAxisAlignment.start -> CrossAxisAlignment.start
    // CrossAxisAlignment.center -> CrossAxisAlignment.center
    // Note: Keep Flutter-style enum syntax for familiarity

    if (expr is PropertyAccessExpressionIR) {
      final name = expr.propertyName;
      // Use Flutter-style enum syntax
      return ConversionResult(
        code: 'CrossAxisAlignment.$name',
        dartType: 'CrossAxisAlignment',
      );
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'CrossAxisAlignment',
    );
  }

  ConversionResult convertMainAxisSize(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      final name = expr.propertyName;
      const mapping = {'max': 'max', 'min': 'min'};

      final value = mapping[name] ?? 'max';
      return ConversionResult(code: "'$value'", dartType: 'MainAxisSize');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'MainAxisSize',
    );
  }

  ConversionResult convertCrossAxisSize(ExpressionIR expr) {
    return convertMainAxisSize(expr);
  }

  // =========================================================================
  // BOX FIT
  // =========================================================================

  ConversionResult convertBoxFit(ExpressionIR expr) {
    // BoxFit.fill -> 'fill'
    // BoxFit.contain -> 'contain'
    // BoxFit.cover -> 'cover'
    // BoxFit.fitWidth -> 'scale-down'
    // BoxFit.fitHeight -> 'scale-down'
    // BoxFit.scaleDown -> 'scale-down'

    if (expr is PropertyAccessExpressionIR) {
      final name = expr.propertyName;
      const mapping = {
        'fill': 'fill',
        'contain': 'contain',
        'cover': 'cover',
        'fitWidth': 'scale-down',
        'fitHeight': 'scale-down',
        'scaleDown': 'scale-down',
        'none': 'auto',
      };

      final css = mapping[name] ?? 'contain';
      return ConversionResult(code: "'$css'", dartType: 'BoxFit');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BoxFit',
    );
  }

  // =========================================================================
  // BOX DECORATION
  // =========================================================================

  ConversionResult convertBoxDecoration(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      final props = <String, String>{};

      for (final entry in expr.namedArguments.entries) {
        final key = entry.key;
        final value = entry.value;

        switch (key) {
          case 'color':
            final colorResult = convertColor(value);
            props['backgroundColor'] = colorResult.code;
            break;

          case 'border':
            final borderResult = convertBorder(value);
            props['border'] = borderResult.code;
            break;

          case 'borderRadius':
            final radiusResult = convertBorderRadius(value);
            props['borderRadius'] = radiusResult.code;
            break;

          case 'boxShadow':
            // Handle box shadows
            if (value is ListExpressionIR) {
              final shadows = value.elements
                  .map((e) => convertBoxShadow(e).code)
                  .join(', ');
              props['boxShadow'] = shadows;
            }
            break;

          case 'image':
            final imgResult = convertDecorationImage(value);
            props['backgroundImage'] = imgResult.code;
            break;

          default:
            props[key] = exprGen.generate(value, parenthesize: false);
        }
      }

      final propsStr = props.entries
          .map((e) => '${e.key}: ${e.value}')
          .join(', ');

      return ConversionResult(
        code: 'new BoxDecoration({$propsStr})',
        dartType: 'BoxDecoration',
      );
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BoxDecoration',
    );
  }

  // =========================================================================
  // BORDER CONVERSION
  // =========================================================================

  ConversionResult convertBorder(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR && expr.methodName == 'all') {
      final value = _getArgumentValue(expr, 0);
      return ConversionResult(code: "Border.all($value)", dartType: 'Border');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Border',
    );
  }

  ConversionResult convertBorderRadius(ExpressionIR expr) {
    // BorderRadius.circular(8) -> '8px'
    // BorderRadius.all(Radius.circular(8)) -> '8px'

    if (expr is MethodCallExpressionIR) {
      final method = expr.methodName;
      final value = _getArgumentValue(expr, 0);

      if (method == 'circular' || method == 'all') {
        return ConversionResult(code: "'${value}px'", dartType: 'BorderRadius');
      }
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BorderRadius',
    );
  }

  ConversionResult convertBorderSide(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BorderSide',
    );
  }

  // =========================================================================
  // SHADOW CONVERSION
  // =========================================================================

  ConversionResult convertBoxShadow(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      final offsetX =
          _getNamedArgumentValueFromInstance(expr, 'offset.dx') ?? '0';
      final offsetY =
          _getNamedArgumentValueFromInstance(expr, 'offset.dy') ?? '0';
      final blur =
          _getNamedArgumentValueFromInstance(expr, 'blurRadius') ?? '4';
      final spread =
          _getNamedArgumentValueFromInstance(expr, 'spreadRadius') ?? '0';
      final color =
          _getNamedArgumentValueFromInstance(expr, 'color') ?? '#000000';

      return ConversionResult(
        code: "$offsetX $offsetY ${blur}px ${spread}px $color",
        dartType: 'BoxShadow',
      );
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BoxShadow',
    );
  }

  ConversionResult convertShadow(ExpressionIR expr) {
    return convertBoxShadow(expr);
  }

  // =========================================================================
  // ANIMATION CONVERSION
  // =========================================================================

  ConversionResult convertDuration(ExpressionIR expr) {
    // Duration(milliseconds: 300) -> 300
    // Duration(seconds: 1) -> 1000

    if (expr is MethodCallExpressionIR) {
      final method = expr.methodName;
      final value = _getArgumentValue(expr, 0);

      // FIX: Handle null value properly
      if (value != null) {
        if (method == 'milliseconds') {
          return ConversionResult(code: value, dartType: 'Duration');
        }

        if (method == 'seconds') {
          return ConversionResult(
            code: '($value * 1000)',
            dartType: 'Duration',
          );
        }
      }
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Duration',
    );
  }

  ConversionResult convertCurve(ExpressionIR expr) {
    // Curves.easeInOut -> 'cubic-bezier(0.4, 0.0, 0.2, 1.0)'
    // Curves.linear -> 'linear'
    // Curves.easeIn -> 'cubic-bezier(0.4, 0.0, 1.0, 1.0)'

    if (expr is PropertyAccessExpressionIR) {
      final curveName = expr.propertyName;
      final cssCurve = _curveToCss(curveName);

      return ConversionResult(code: "'$cssCurve'", dartType: 'Curve');
    }

    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Curve',
    );
  }

  // =========================================================================
  // BASIC TYPE CONVERSIONS
  // =========================================================================

  ConversionResult convertDouble(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'double',
    );
  }

  ConversionResult convertInt(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'int',
    );
  }

  ConversionResult convertString(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'String',
    );
  }

  ConversionResult convertBool(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'bool',
    );
  }

  ConversionResult convertList(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'List',
    );
  }

  ConversionResult convertMap(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Map',
    );
  }

  ConversionResult convertOffset(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Offset',
    );
  }

  ConversionResult convertMatrix4(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Matrix4',
    );
  }

  ConversionResult convertIconData(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'IconData',
    );
  }

  ConversionResult convertBoxConstraints(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'BoxConstraints',
    );
  }

  ConversionResult convertSize(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'Size',
    );
  }

  ConversionResult convertDecorationImage(ExpressionIR expr) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: 'DecorationImage',
    );
  }

  ConversionResult _fallbackConversion(ExpressionIR expr, String? type) {
    return ConversionResult(
      code: exprGen.generate(expr, parenthesize: false),
      dartType: type ?? 'unknown',
      warnings: ['No specific converter for $type'],
    );
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  String _getMaterialColorHex(String colorName) {
    const materialColors = {
      'red': '#F44336',
      'pink': '#E91E63',
      'purple': '#9C27B0',
      'deeppurple': '#673AB7',
      'indigo': '#3F51B5',
      'blue': '#2196F3',
      'lightblue': '#03A9F4',
      'cyan': '#00BCD4',
      'teal': '#009688',
      'green': '#4CAF50',
      'lightgreen': '#8BC34A',
      'lime': '#CDDC39',
      'yellow': '#FFEB3B',
      'amber': '#FFC107',
      'orange': '#FF9800',
      'deeporange': '#FF5722',
      'brown': '#795548',
      'grey': '#9E9E9E',
      'bluegrey': '#607D8B',
      'black': '#000000',
      'white': '#FFFFFF',
    };

    return materialColors[colorName] ?? '#000000';
  }

  String _intToHex(int value) {
    final hex = (value & 0xFFFFFFFF).toRadixString(16).toUpperCase();
    return '#${hex.padLeft(8, '0')}';
  }

  String _alignmentToCss(String align) {
    const mapping = {
      'topLeft': 'flex-start flex-start',
      'topCenter': 'center flex-start',
      'topRight': 'flex-end flex-start',
      'centerLeft': 'flex-start center',
      'center': 'center center',
      'centerRight': 'flex-end center',
      'bottomLeft': 'flex-start flex-end',
      'bottomCenter': 'center flex-end',
      'bottomRight': 'flex-end flex-end',
    };

    return mapping[align] ?? 'center center';
  }

  String _convertFontWeight(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      const mapping = {
        'w100': '100',
        'w200': '200',
        'w300': '300',
        'normal': '400',
        'w400': '400',
        'w500': '500',
        'w600': '600',
        'bold': '700',
        'w700': '700',
        'w800': '800',
        'w900': '900',
      };

      final weight = mapping[expr.propertyName] ?? '400';
      return weight;
    }

    return exprGen.generate(expr, parenthesize: false);
  }

  String _convertFontStyle(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      const mapping = {'normal': 'normal', 'italic': 'italic'};

      return mapping[expr.propertyName] ?? 'normal';
    }

    return exprGen.generate(expr, parenthesize: false);
  }

  String _convertTextDecoration(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      const mapping = {
        'underline': 'underline',
        'overline': 'overline',
        'lineThrough': 'line-through',
        'none': 'none',
      };

      return mapping[expr.propertyName] ?? 'none';
    }

    return exprGen.generate(expr, parenthesize: false);
  }

  String _curveToCss(String curveName) {
    const curves = {
      'linear': 'linear',
      'easeIn': 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
      'easeOut': 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
      'easeInOut': 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
      'fastOutSlowIn': 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
      'slowMiddle': 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
      'bounceIn': 'cubic-bezier(0.675, 0.19, 0.985, 0.16)',
      'bounceOut': 'cubic-bezier(0.015, 0.84, 0.33, 1.0)',
      'bounceInOut': 'cubic-bezier(0.675, 0.19, 0.985, 0.16)',
      'elasticIn': 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
      'elasticOut': 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
    };

    return curves[curveName] ?? 'linear';
  }

  String? _getArgumentValue(MethodCallExpressionIR expr, int index) {
    if (index < expr.arguments.length) {
      return exprGen.generate(expr.arguments[index], parenthesize: false);
    }
    return null;
  }

  String? _getNamedArgumentValue(MethodCallExpressionIR expr, String name) {
    if (expr.namedArguments.containsKey(name)) {
      return exprGen.generate(expr.namedArguments[name]!, parenthesize: false);
    }
    return null;
  }

  String? _getNamedArgumentValueFromInstance(
    InstanceCreationExpressionIR expr,
    String name,
  ) {
    if (expr.namedArguments.containsKey(name)) {
      return exprGen.generate(expr.namedArguments[name]!, parenthesize: false);
    }
    return null;
  }

  // =========================================================================
  // REPORTING
  // =========================================================================

  /// Generate conversion report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n-----------------------------------------');
    buffer.writeln('  PROPERTY CONVERSION REPORT');
    buffer.writeln('-----------------------------------------\n');

    buffer.writeln('Total conversions: ${conversionLog.length}');

    if (conversionLog.isNotEmpty) {
      buffer.writeln('\nConversion History:');
      for (final log in conversionLog) {
        buffer.writeln('  - $log');
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// INTEGRATION WITH WIDGET GENERATORS
// ============================================================================

/// Extension to use converters easily in code generation
extension PropConversionHelper on Map<String, ExpressionIR> {
  /// Convert all named arguments using property types
  Map<String, String> convertAllProps(
    FlutterPropConverter converter,
    Map<String, String> propTypes,
  ) {
    final converted = <String, String>{};

    forEach((name, expr) {
      final propType = propTypes[name];
      final result = converter.convertProperty(name, expr, propType);
      converted[name] = result.code;
    });

    return converted;
  }
}
