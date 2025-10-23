import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'dart:io';

// ============================================================================
// WORKING DART FILE PARSER - Using actual analyzer API
// ============================================================================

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
