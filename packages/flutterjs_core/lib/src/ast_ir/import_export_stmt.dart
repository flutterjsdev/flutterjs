import 'diagnostics/source_location.dart';
import 'package:meta/meta.dart';
import 'variable_decl.dart';

// =============================================================================
// IMPORT/EXPORT STATEMENTS
// =============================================================================

/// Represents an import directive
@immutable
class ImportStmt {
  /// The URI being imported (e.g., 'package:flutter/material.dart')
  final String uri;

  /// Optional prefix (e.g., 'as prefix_name')
  final String? prefix;

  /// Whether this is a deferred import
  final bool isDeferred;

  /// Names explicitly shown (empty means all are shown)
  final List<String> showList;

  /// Names explicitly hidden
  final List<String> hideList;

  /// File location of this import
  final SourceLocationIR sourceLocation;

  /// Optional documentation comment
  final String? documentation;

  /// Metadata annotations on the import
  final List<AnnotationIR> annotations;

  const ImportStmt({
    required this.uri,
    this.prefix,
    this.isDeferred = false,
    this.showList = const [],
    this.hideList = const [],
    required this.sourceLocation,
    this.documentation,
    this.annotations = const [],
  });

  /// Whether this import shows a specific name
  ///
  /// Returns true if:
  /// - showList is empty (imports everything) AND name is not hidden
  /// - OR name is explicitly shown AND not hidden
  bool shows(String name) {
    if (showList.isEmpty) return !hideList.contains(name);
    return showList.contains(name) && !hideList.contains(name);
  }

  /// Whether this import shows all names (no restrictions)
  bool get showsAll => showList.isEmpty && hideList.isEmpty;

  /// Whether this import uses selective imports (show/hide)
  bool get hasRestrictions => showList.isNotEmpty || hideList.isNotEmpty;

  /// Get the effective list of exposed names
  ///
  /// Returns:
  /// - null if showsAll (all names exposed)
  /// - Otherwise, list of names that would pass shows()
  List<String>? get effectiveExposure {
    if (showsAll) return null;
    // If we have a showList, that's the effective list (minus hideList)
    if (showList.isNotEmpty) {
      return showList.where((name) => !hideList.contains(name)).toList();
    }
    // Otherwise we're hiding specific names from everything
    return null; // Represents "all except hideList"
  }

  /// Qualified name if prefix is set
  String qualifiedName(String name) => prefix != null ? '$prefix.$name' : name;

  Map<String, dynamic> toJson() {
    return {
      'uri': uri,
      if (prefix != null) 'prefix': prefix,
      'isDeferred': isDeferred,
      if (showList.isNotEmpty) 'showList': showList,
      if (hideList.isNotEmpty) 'hideList': hideList,
      'sourceLocation': sourceLocation.toJson(),
      if (documentation != null) 'documentation': documentation,
      if (annotations.isNotEmpty)
        'annotations': annotations.map((a) => a.toJson()).toList(),
    };
  }

  @override
  String toString() {
    final prefix_ = prefix != null ? ' as $prefix' : '';
    final deferred = isDeferred ? ' deferred' : '';
    final show = showList.isNotEmpty ? ' show ${showList.join(", ")}' : '';
    final hide = hideList.isNotEmpty ? ' hide ${hideList.join(", ")}' : '';
    return 'import \'$uri\'$prefix_$deferred$show$hide';
  }
}

/// Represents an export directive
@immutable
class ExportStmt {
  /// The URI being exported (e.g., 'widgets.dart')
  final String uri;

  /// Names explicitly shown (empty means all are shown)
  final List<String> showList;

  /// Names explicitly hidden
  final List<String> hideList;

  /// File location of this export
  final SourceLocationIR sourceLocation;

  /// Optional documentation comment
  final String? documentation;

  const ExportStmt({
    required this.uri,
    this.showList = const [],
    this.hideList = const [],
    required this.sourceLocation,
    this.documentation,
  });

  /// Whether this export exposes a specific name
  ///
  /// Returns true if:
  /// - showList is empty (exports everything) AND name is not hidden
  /// - OR name is explicitly shown AND not hidden
  bool exposes(String name) {
    if (showList.isEmpty) return !hideList.contains(name);
    return showList.contains(name) && !hideList.contains(name);
  }

  /// Whether this export exposes all names (no restrictions)
  bool get exportsAll => showList.isEmpty && hideList.isEmpty;

  /// Whether this export uses selective exports (show/hide)
  bool get hasRestrictions => showList.isNotEmpty || hideList.isNotEmpty;

  /// Get the effective list of exposed names
  ///
  /// Returns:
  /// - null if exportsAll (all names exposed)
  /// - Otherwise, effective restrictions
  List<String>? get effectiveExposure {
    if (exportsAll) return null;
    if (showList.isNotEmpty) {
      return showList.where((name) => !hideList.contains(name)).toList();
    }
    return null; // Represents "all except hideList"
  }

  @override
  String toString() {
    final show = showList.isNotEmpty ? ' show ${showList.join(", ")}' : '';
    final hide = hideList.isNotEmpty ? ' hide ${hideList.join(", ")}' : '';
    return 'export \'$uri\'$show$hide';
  }

  Map<String, dynamic> toJson() {
    return {
      'uri': uri,
      if (showList.isNotEmpty) 'showList': showList,
      if (hideList.isNotEmpty) 'hideList': hideList,
      'sourceLocation': sourceLocation.toJson(),
      if (documentation != null) 'documentation': documentation,
    };
  }
}

/// Represents a library part directive
@immutable
class PartStmt {
  /// The URI of the part file (e.g., 'widgets/button.dart')
  final String uri;

  /// File location
  final SourceLocationIR sourceLocation;

  const PartStmt({required this.uri, required this.sourceLocation});

  @override
  String toString() => 'part \'$uri\'';

  Map<String, dynamic> toJson() {
    return {
      'uri': uri,
      'sourceLocation': sourceLocation.toJson(),
    };
  } 
}

/// Represents a "part of" directive
@immutable
class PartOfStmt {
  /// The library name (e.g., 'my_app.widgets')
  final String libraryName;

  /// File location
  final SourceLocationIR sourceLocation;

  const PartOfStmt({required this.libraryName, required this.sourceLocation});

  @override
  String toString() => 'part of $libraryName;';
}
