import 'package:meta/meta.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

import 'class_decl.dart';
import 'diagnostics/analysis_issue.dart';
import 'diagnostics/issue_category.dart';
import 'function_decl.dart';
import 'import_export_stmt.dart';
import 'ir_id_generator.dart';
import 'variable_decl.dart';

// =============================================================================
// LIBRARY METADATA
// =============================================================================

/// Metadata about the entire Dart file/library
@immutable
class LibraryMetadata {
  /// Library name (from 'library' directive)
  final String? libraryName;

  /// Documentation comment above library
  final String? documentation;

  /// @deprecated annotation if present
  final bool isDeprecated;

  /// Deprecation message if deprecated
  final String? deprecationMessage;

  /// Custom analyzer directives (e.g., // ignore: lint_code)
  final List<String> analyzerDirectives;

  /// Other annotations on the library
  final List<String> annotations;

  /// When this file was analyzed
  final DateTime? analyzedAt;

  /// Version of analyzer used
  final String? analyzerVersion;

  /// Environment requirements from pubspec.yaml
  final Map<String, String> environment;

  const LibraryMetadata({
    this.libraryName,
    this.documentation,
    this.isDeprecated = false,
    this.deprecationMessage,
    this.analyzerDirectives = const [],
    this.annotations = const [],
    this.analyzedAt,
    this.analyzerVersion,
    this.environment = const {},
  });

  @override
  String toString() => 'Library${libraryName != null ? ' $libraryName' : ''}';
}

// =============================================================================
// MAIN DART FILE STRUCTURE
// =============================================================================

/// Complete representation of a Dart source file
@immutable
class DartFile {
  /// Absolute path to the .dart file
  final String filePath;

  /// Package name this file belongs to (e.g., 'my_app', 'flutter')
  /// Null if file is not in a package
  final String? package;

  /// Library this file belongs to (resolved from imports/exports)
  final String? library;

  /// All import directives in order
  final List<ImportStmt> imports;

  /// All export directives in order
  final List<ExportStmt> exports;

  /// All part directives
  final List<PartStmt> parts;

  /// Part-of directive (if this is a part file)
  final PartOfStmt? partOf;

  /// MD5 hash of original file content for change detection
  final String contentHash;

  /// Analysis issues found in this file
  final List<AnalysisIssue> analysisIssues;

  /// Library-level metadata
  final LibraryMetadata metadata;

  /// Top-level class declarations
  final List<ClassDecl> classDeclarations;

  /// Top-level function declarations
  final List<FunctionDecl> functionDeclarations;

  /// Top-level variable declarations
  final List<VariableDecl> variableDeclarations;

  /// Top-level enum declarations
  final List<String> enumDeclarations;

  /// Top-level mixin declarations
  final List<String> mixinDeclarations;

  /// Top-level typedef declarations
  final List<String> typedefDeclarations;

  /// Extension declarations
  final List<String> extensionDeclarations;

  /// When this file was created
  final DateTime createdAt;

  /// When this file was last analyzed
  final DateTime? lastAnalyzedAt;

  const DartFile({
    required this.filePath,
    this.package,
    this.library,
    this.imports = const [],
    this.exports = const [],
    this.parts = const [],
    this.partOf,
    required this.contentHash,
    this.analysisIssues = const [],
    required this.metadata,
    this.classDeclarations = const [],
    this.functionDeclarations = const [],
    this.variableDeclarations = const [],
    this.enumDeclarations = const [],
    this.mixinDeclarations = const [],
    this.typedefDeclarations = const [],
    this.extensionDeclarations = const [],
    required this.createdAt,
    this.lastAnalyzedAt,
  });

  /// Total number of declarations in this file
  int get declarationCount =>
      classDeclarations.length +
      functionDeclarations.length +
      variableDeclarations.length +
      enumDeclarations.length +
      mixinDeclarations.length +
      typedefDeclarations.length +
      extensionDeclarations.length;

  /// Count of issues by severity
  Map<IssueSeverity, int> get issuesBySeverity {
    final result = <IssueSeverity, int>{};
    for (final issue in analysisIssues) {
      result[issue.severity] = (result[issue.severity] ?? 0) + 1;
    }
    return result;
  }

  /// Count of issues by category
  Map<IssueCategory, int> get issuesByCategory {
    final result = <IssueCategory, int>{};
    for (final issue in analysisIssues) {
      result[issue.category] = (result[issue.category] ?? 0) + 1;
    }
    return result;
  }

  /// Error count (severity = error)
  int get errorCount =>
      analysisIssues.where((i) => i.severity == IssueSeverity.error).length;

  /// Warning count (severity = warning)
  int get warningCount =>
      analysisIssues.where((i) => i.severity == IssueSeverity.warning).length;

  /// Whether file has any errors
  bool get hasErrors => errorCount > 0;

  /// Whether file is a part file
  bool get isPartFile => partOf != null;

  /// Whether file is a library file (has library directive or is main)
  bool get isLibraryFile => !isPartFile;

  /// All symbols exported by this file (via exports)
  Set<String> get exportedSymbols {
    final symbols = <String>{};
    for (final export in exports) {
      // Would need to load the exported file to get actual symbols
      // This is a placeholder
      if (export.showList.isNotEmpty) {
        symbols.addAll(export.showList);
      }
    }
    return symbols;
  }

  /// All symbols imported by this file
  Set<String> get importedSymbols {
    final symbols = <String>{};
    for (final import in imports) {
      if (import.showList.isNotEmpty) {
        symbols.addAll(import.showList);
      }
    }
    return symbols;
  }

  /// Summary of file contents
  String toSummary() {
    return '''
DartFile: $filePath
Package: $package
Library: $library${partOf != null ? ' (part of ${partOf!.libraryName})' : ''}
Declarations: $declarationCount
  - Classes: ${classDeclarations.length}
  - Functions: ${functionDeclarations.length}
  - Variables: ${variableDeclarations.length}
  - Enums: ${enumDeclarations.length}
  - Mixins: ${mixinDeclarations.length}
Imports: ${imports.length}
Exports: ${exports.length}
Issues: ${analysisIssues.length}
  - Errors: $errorCount
  - Warnings: $warningCount
''';
  }

  @override
  String toString() => 'DartFile($filePath)';
}

// =============================================================================
// BUILDER PATTERN FOR CONSTRUCTING DARTFILE
// =============================================================================

/// Builder for constructing DartFile instances
class DartFileBuilder {
  final IRIdGenerator idGenerator;
  late String filePath;
  String? package;
  String? library;
  final List<ImportStmt> imports = [];
  final List<ExportStmt> exports = [];
  final List<PartStmt> parts = [];
  PartOfStmt? partOf;
  late String contentHash;
  final List<AnalysisIssue> analysisIssues = [];
  late LibraryMetadata metadata;
  final List<ClassDecl> classDeclarations = [];
  final List<FunctionDecl> functionDeclarations = [];
  final List<VariableDecl> variableDeclarations = [];
  final List<String> enumDeclarations = [];
  final List<String> mixinDeclarations = [];
  final List<String> typedefDeclarations = [];
  final List<String> extensionDeclarations = [];
  late DateTime createdAt;
  DateTime? lastAnalyzedAt;

  DartFileBuilder({required this.filePath, String? projectRoot})
    : idGenerator = IRIdGenerator(filePath: filePath, projectRoot: projectRoot),
      createdAt = DateTime.now(),
      metadata = LibraryMetadata(),
      contentHash = '';

  // Main method - use this in declaration_pass.dart
  String generateId(String type, [String? name]) {
    return idGenerator.generateId(type, name);
  }

  // For nested contexts
  String generateContextualId(String type, String name, String parent) {
    return idGenerator.generateContextualId(type, name, parentContext: parent);
  }

  /// Set the package this file belongs to
  DartFileBuilder withPackage(String? pkg) {
    package = pkg;
    return this;
  }

  /// Set library name
  DartFileBuilder withLibrary(String? lib) {
    library = lib;
    return this;
  }

  /// Add an import
  DartFileBuilder addImport(ImportStmt import) {
    imports.add(import);
    return this;
  }

  /// Add multiple imports
  DartFileBuilder addImports(List<ImportStmt> imps) {
    imports.addAll(imps);
    return this;
  }

  /// Add an export
  DartFileBuilder addExport(ExportStmt export) {
    exports.add(export);
    return this;
  }

  /// Add a part
  DartFileBuilder addPart(PartStmt part) {
    parts.add(part);
    return this;
  }

  /// Add multiple parts
  DartFileBuilder addParts(List<PartStmt> partList) {
    parts.addAll(partList);
    return this;
  }

  /// Set the part-of directive
  DartFileBuilder withPartOf(PartOfStmt partOfStmt) {
    partOf = partOfStmt;
    return this;
  }

  /// Add a class declaration
  DartFileBuilder addClass(ClassDecl classDecl) {
    classDeclarations.add(classDecl);
    return this;
  }

  /// Add a function declaration
  DartFileBuilder addFunction(FunctionDecl func) {
    functionDeclarations.add(func);
    return this;
  }

  /// Add a variable declaration
  DartFileBuilder addVariable(VariableDecl var_) {
    variableDeclarations.add(var_);
    return this;
  }

  /// Add an analysis issue
  DartFileBuilder addIssue(AnalysisIssue issue) {
    analysisIssues.add(issue);
    return this;
  }

  /// Set metadata
  DartFileBuilder withMetadata(LibraryMetadata meta) {
    metadata = meta;
    return this;
  }

  /// Compute and set content hash from file content
  DartFileBuilder withContentHash(String fileContent) {
    contentHash = md5.convert(utf8.encode(fileContent)).toString();
    return this;
  }

  /// Mark as analyzed now
  DartFileBuilder markAnalyzed() {
    lastAnalyzedAt = DateTime.now();
    return this;
  }

  /// Build the DartFile
  DartFile build() {
    return DartFile(
      filePath: filePath,
      package: package,
      library: library,
      imports: imports,
      exports: exports,
      parts: parts,
      partOf: partOf,
      contentHash: contentHash,
      analysisIssues: analysisIssues,
      metadata: metadata,
      classDeclarations: classDeclarations,
      functionDeclarations: functionDeclarations,
      variableDeclarations: variableDeclarations,
      enumDeclarations: enumDeclarations,
      mixinDeclarations: mixinDeclarations,
      typedefDeclarations: typedefDeclarations,
      extensionDeclarations: extensionDeclarations,
      createdAt: createdAt,
      lastAnalyzedAt: lastAnalyzedAt,
    );
  }
}
