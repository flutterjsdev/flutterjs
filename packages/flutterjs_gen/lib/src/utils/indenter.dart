// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// FIXED: Indenter Class
// ============================================================================

class Indenter {
  final String _indent;
  int _level = 0;

  Indenter(this._indent);

  void indent() => _level++;

  void dedent() {
    if (_level > 0) _level--;
  }

  // ✅ FIXED: Return proper indentation for current level
  String currentIndent() {
    return _indent * _level;
  }

  // ✅ FIXED: Apply indentation to all lines
  String apply(String code) {
    return code
        .split('\n')
        .map((line) => line.isEmpty ? '' : '${current}$line')
        .join('\n');
  }

  // ✅ FIXED: Indentation string for current level
  String get current => _indent * _level;

  // ✅ FIXED: Indentation string for next level
  String get next => _indent * (_level + 1);

  // ✅ FIXED: Return line with current indentation
  String line(String code) => '$current$code';
}
