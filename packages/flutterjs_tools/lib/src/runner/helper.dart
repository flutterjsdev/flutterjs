import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'dart:io';

/// ============================================================================
/// DartFileParser
/// ============================================================================
///
/// A lightweight wrapper around the Dart `analyzer` package for parsing and
/// resolving Dart files inside a Flutter.js project.
///
/// This utility abstracts away the complexity of managing
/// `AnalysisContextCollection`, synchronous parsing, resolved units, and errors.
///
/// It provides:
///
///   • **Synchronous AST parsing** via `getParsedUnit()`  
///   • **Asynchronous semantic resolution** via `getResolvedUnit()`  
///   • **One-time initialization** of the analyzer context  
///   • **Safe disposal** of the underlying context collection  
///
///
/// # Why This Exists
///
/// The analyzer package is highly flexible but verbose. A simple "`parse this
/// file`" operation normally requires:
///
///   • creating a file system resource provider  
///   • creating an `AnalysisContextCollection`  
///   • retrieving the correct context  
///   • handling both `ParsedUnitResult` and `ResolvedUnitResult`  
///
/// This helper class encapsulates all of that into clean and safe APIs.
///
///
/// # Usage
///
/// ## Initialize Once
/// ```dart
/// DartFileParser.initialize(projectRoot: '/my/project');
/// ```
///
/// ## Parse a Dart File (AST only)
/// ```dart
/// final unit = DartFileParser.parseFile('lib/main.dart');
/// if (unit != null) {
///   print(unit.directives);
/// }
/// ```
///
/// ## Resolve a Dart File (includes types)
/// ```dart
/// final resolved = await DartFileParser.getResolvedUnit('lib/main.dart');
/// print(resolved?.toSource());
/// ```
///
/// ## Dispose When Done
/// ```dart
/// DartFileParser.dispose();
/// ```
///
///
/// # Methods
///
/// ## `initialize({String? projectRoot})`
/// Creates a new `AnalysisContextCollection` for the given root directory.
/// Must be called before `parseFile` or `getResolvedUnit`.
///
/// Uses:
/// ```dart
/// AnalysisContextCollection(
///   includedPaths: [projectRoot],
///   resourceProvider: PhysicalResourceProvider.INSTANCE,
/// );
/// ```
///
///
/// ## `parseFile(String filePath)`
/// Synchronously parses a Dart file using:
///
/// ```dart
/// session.getParsedUnit(filePath)
/// ```
///
/// Returns:
///   • `CompilationUnit` on success  
///   • `null` if parsing fails or analyzer cannot handle the input  
///
/// **Does NOT include type information.**
///
///
/// ## `getResolvedUnit(String filePath)`
/// Asynchronously resolves a file with full semantic info:
///
/// ```dart
/// await session.getResolvedUnit(filePath)
/// ```
///
/// Returns:
///   • `CompilationUnit` with resolved types  
///   • `null` on failure  
///
///
/// ## `dispose()`
/// Safely releases the `AnalysisContextCollection`.  
/// Should be called when shutting down the analyzer pipeline.
///
///
/// # Implementation Notes
///
/// • `getParsedUnit()` is synchronous and fast — best for passes like  
///   DeclarationPass where only the AST structure is needed.  
///
/// • `getResolvedUnit()` is asynchronous and slow — use only when type
///   information is required (e.g., type checking or advanced analysis).
///
/// • Both methods require type checking (`is ParsedUnitResult` and  
///   `is ResolvedUnitResult`) because the analyzer returns abstract result types.
///
///
/// # Summary
///
/// `DartFileParser` provides a minimal, stable, and developer-friendly interface
/// around the Dart analyzer for:
///
///   ✔ AST parsing  
///   ✔ Full semantic resolution  
///   ✔ Project-wide context management  
///   ✔ Error-safe handling  
///
/// It is the recommended entry point for all parsing inside Flutter.js.
///

/// Correct implementation using analyzer package's actual methods
class DartFileParser {
  static late AnalysisContextCollection _contextCollection;
  static bool _initialized = false;

  /// Initialize parser - call this ONCE at the start
  static void initialize({String? projectRoot}) {
    if (_initialized) return;

    try {
      final rootPath = projectRoot ?? Directory.current.path;

      _contextCollection = AnalysisContextCollection(
        includedPaths: [rootPath],
        resourceProvider: PhysicalResourceProvider.INSTANCE,
      );

      _initialized = true;
      print('✓ Analyzer initialized');
    } catch (e) {
      print('Failed to initialize analyzer: $e');
      rethrow;
    }
  }

  /// Parse a Dart file - Use getParsedUnit (synchronous)
  static CompilationUnit? parseFile(String filePath) {
    if (!_initialized) {
      throw Exception(
        'Analyzer not initialized. Call DartFileParser.initialize() first.',
      );
    }

    try {
      if (_contextCollection.contexts.isEmpty) {
        print('No analysis contexts');
        return null;
      }

      final context = _contextCollection.contexts.first;
      final session = context.currentSession;

      // getParsedUnit - synchronous parsing
      final result = session.getParsedUnit(filePath);

      if (result is ParsedUnitResult) {
        return result.unit;
      } else {
        print('Could not parse: $filePath');
        return null;
      }
    } catch (e) {
      print('Parse error in $filePath: $e');
      return null;
    }
  }

  /// Get resolved unit (with type information) - async version if needed
  static Future<CompilationUnit?> getResolvedUnit(String filePath) async {
    if (!_initialized) {
      throw Exception(
        'Analyzer not initialized. Call DartFileParser.initialize() first.',
      );
    }

    try {
      if (_contextCollection.contexts.isEmpty) {
        print('No analysis contexts');
        return null;
      }

      final context = _contextCollection.contexts.first;
      final session = context.currentSession;

      // getResolvedUnit - async, returns semantic info
      final result = await session.getResolvedUnit(filePath);

      if (result is ResolvedUnitResult) {
        return result.unit;
      } else {
        print('Could not resolve: $filePath');
        return null;
      }
    } catch (e) {
      print('Resolution error in $filePath: $e');
      return null;
    }
  }

  /// Cleanup - call this at the end
  static void dispose() {
    if (_initialized) {
      try {
        _contextCollection.dispose();
        _initialized = false;
      } catch (e) {
        print('Error disposing: $e');
      }
    }
  }
}

// ============================================================================
// KEY POINTS
// ============================================================================

/*
1. getParsedUnit(path) - SYNCHRONOUS
   - Returns ParsedUnitResult? directly (not a Future)
   - Access: result.unit to get CompilationUnit
   - Use this for quick parsing without semantic analysis
   - Type check: if (result is ParsedUnitResult)

2. getResolvedUnit(path) - ASYNCHRONOUS
   - Returns Future<ResolvedUnitResult?>
   - Must await it
   - Access: (await result).unit to get CompilationUnit
   - Includes type information and semantic analysis
   - Use when you need full analysis

3. CompilationUnit - the AST you need
   - Has .directives and .declarations
   - This is what you pass to DeclarationPass

4. Type checking is important:
   - Both return result objects that need type checking
   - Use 'is ParsedUnitResult' or 'is ResolvedUnitResult' to verify
*/
