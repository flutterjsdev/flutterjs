// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

enum WarningSeverity { info, warning, error }

class CodeGenWarning {
  final WarningSeverity severity;
  final String message;
  final String? details;
  final String? suggestion;
  final String? widget;
  final String? property;

  CodeGenWarning({
    required this.severity,
    required this.message,
    this.details,
    this.suggestion,
    this.widget,
    this.property,
  });

  @override
  String toString() => '${severity.name.toUpperCase()}: $message';
}

class CodeGenError {
  final String message;
  final String? expressionType;
  final String? suggestion;

  CodeGenError({required this.message, this.expressionType, this.suggestion});

  @override
  String toString() =>
      'ERROR: $message'
      '${expressionType != null ? ' (type: $expressionType)' : ''}'
      '${suggestion != null ? '\n  Suggestion: $suggestion' : ''}';
}
