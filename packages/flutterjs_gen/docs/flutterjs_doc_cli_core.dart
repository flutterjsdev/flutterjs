// // bin/flutterjs_doc.dart - Main CLI Entry Point

// import 'package:args/command_runner.dart';
// import 'package:flutterjs_doc/src/commands/generate_command.dart';
// import 'package:flutterjs_doc/src/commands/serve_command.dart';
// import 'package:flutterjs_doc/src/utils/logger.dart';

// void main(List<String> arguments) async {
//   final runner = CommandRunner<void>(
//     'flutterjs',
//     'FlutterJS documentation generator - Create stunning API docs from Dart code.',
//   )
//     ..addCommand(GenerateCommand())
//     ..addCommand(ServeCommand());

//   try {
//     await runner.run(arguments);
//   } on UsageException catch (e) {
//     logger.error('Error: ${e.message}');
//     print('\n${e.usage}');
//     exit(1);
//   } catch (e) {
//     logger.error('Fatal error: $e');
//     exit(1);
//   }
// }

// // ============================================================================
// // lib/src/commands/generate_command.dart - Main Doc Generation
// // ============================================================================

// import 'dart:io';
// import 'package:args/command_runner.dart';
// import 'package:flutterjs_doc/src/analyzer/dart_analyzer.dart';
// import 'package:flutterjs_doc/src/analyzer/js_analyzer.dart';
// import 'package:flutterjs_doc/src/generator/html_generator.dart';
// import 'package:flutterjs_doc/src/config/config_loader.dart';
// import 'package:flutterjs_doc/src/utils/logger.dart';

// class GenerateCommand extends Command<void> {
//   @override
//   String get name => 'doc';

//   @override
//   String get description => 'Generate FlutterJS API documentation';

//   GenerateCommand() {
//     argParser
//       ..addOption(
//         'output',
//         abbr: 'o',
//         defaultsTo: 'docs',
//         help: 'Output directory for generated documentation',
//       )
//       ..addFlag(
//         'verbose',
//         help: 'Enable verbose logging',
//       )
//       ..addFlag(
//         'serve',
//         help: 'Start local development server after generation',
//       )
//       ..addOption(
//         'config',
//         defaultsTo: 'flutterjs.yaml',
//         help: 'Path to configuration file',
//       );
//   }

//   @override
//   Future<void> run() async {
//     logger.init(verbose: argResults!['verbose'] as bool);

//     logger.info('🚀 FlutterJS Documentation Generator');
//     logger.info('Generating beautiful API docs...\n');

//     final outputDir = argResults!['output'] as String;
//     final configPath = argResults!['config'] as String;
//     final shouldServe = argResults!['serve'] as bool;

//     try {
//       // 1. Load configuration
//       logger.step('Loading configuration from $configPath');
//       final config = await ConfigLoader.load(configPath);
//       logger.success('✓ Configuration loaded\n');

//       // 2. Analyze Dart files
//       logger.step('Analyzing Dart code...');
//       final dartAnalyzer = DartAnalyzer();
//       final docPackage = await dartAnalyzer.analyze('lib');
//       logger.success('✓ Found ${docPackage.elements.length} classes/methods\n');

//       // 3. Extract JavaScript equivalents
//       logger.step('Analyzing generated JavaScript...');
//       final jsAnalyzer = JSAnalyzer();
//       int jsCount = 0;
//       for (final element in docPackage.elements) {
//         final jsCode = await jsAnalyzer.getJavaScriptEquivalent(element);
//         if (jsCode != null) {
//           element.jsCode = jsCode;
//           jsCount++;
//         }
//       }
//       logger.success('✓ Extracted $jsCount JavaScript equivalents\n');

//       // 4. Generate HTML documentation
//       logger.step('Generating HTML documentation...');
//       final generator = HtmlGenerator(config: config);
//       await generator.generate(
//         docPackage: docPackage,
//         outputDir: outputDir,
//       );
//       logger.success('✓ Documentation generated in $outputDir/\n');

//       // 5. Generate guides
//       logger.step('Generating guide pages...');
//       await generator.generateGuides(outputDir);
//       logger.success('✓ Guide pages generated\n');

//       // 6. Print summary
//       logger.info('📊 Generation Summary:');
//       logger.info('   • Classes: ${docPackage.elements.where((e) => e.type.isClass).length}');
//       logger.info('   • Methods: ${docPackage.elements.where((e) => e.type.isMethod).length}');
//       logger.info('   • JS equivalents: $jsCount');
//       logger.info('   • Output: $outputDir/index.html\n');

//       if (shouldServe) {
//         logger.info('🌐 Starting development server...');
//         logger.info('   → http://localhost:8080\n');
//         logger.info('Press Ctrl+C to stop.\n');

//         // Launch dev server
//         const Duration(milliseconds: 500).delay();
//         Process.run('dart', ['run', 'flutterjs_doc:serve', '--dir', outputDir]);
//       } else {
//         logger.success('✅ Documentation generated successfully!');
//         logger.info('   Use "flutterjs doc --serve" to start a dev server.\n');
//       }
//     } catch (e, st) {
//       logger.error('Generation failed: $e');
//       if (logger.verbose) {
//         logger.error('Stack trace:\n$st');
//       }
//       exit(1);
//     }
//   }
// }

// // ============================================================================
// // lib/src/analyzer/dart_analyzer.dart - Core Dart Analysis
// // ============================================================================

// import 'package:analyzer/dart/analysis/analysis_context.dart';
// import 'package:analyzer/dart/ast/ast.dart';
// import 'package:analyzer/file_system/physical_file_system.dart';
// import 'package:analyzer/src/dart/analysis/analysis_context_collection.dart';
// import 'package:glob/glob.dart';
// import 'package:flutterjs_doc/src/analyzer/models.dart';

// class DartAnalyzer {
//   late AnalysisContextCollection _collection;

//   Future<DocPackage> analyze(String libDir) async {
//     // Initialize analyzer
//     _collection = AnalysisContextCollection(
//       includedPaths: [libDir],
//       resourceProvider: PhysicalResourceProvider.INSTANCE,
//     );

//     final elements = <DartElement>[];
//     final libraryMap = <String, List<DartElement>>{};

//     // Find all Dart files
//     final files = Glob('$libDir/**/*.dart').listSync();

//     for (final entity in files) {
//       if (entity is File) {
//         final session = _collection.contextFor(entity.path).currentSession;
//         final result = await session.getResolvedUnit(entity.path);

//         if (result case ResolvedUnitResult result) {
//           for (final decl in result.unit.declarations) {
//             final element = _parseDeclaration(decl, result);
//             if (element != null) {
//               elements.add(element);

//               // Group by library
//               final lib = element.library;
//               libraryMap.putIfAbsent(lib, () => []).add(element);
//             }
//           }
//         }
//       }
//     }

//     return DocPackage(
//       name: 'MyFlutterJS',
//       version: '1.0.0',
//       description: 'API Documentation',
//       elements: elements,
//       libraryMap: libraryMap,
//       generatedAt: DateTime.now(),
//     );
//   }

//   DartElement? _parseDeclaration(AstNode node, ResolvedUnitResult result) {
//     if (node case ClassDeclaration classNode) {
//       return _parseClass(classNode, result);
//     } else if (node case FunctionDeclaration funcNode) {
//       return _parseFunction(funcNode, result);
//     }
//     return null;
//   }

//   DartElement _parseClass(ClassDeclaration node, ResolvedUnitResult result) {
//     final doc = _extractDocComment(node);
//     final name = node.name.lexeme;
//     final source = node.toSource();

//     // Extract inheritance
//     String? inheritance;
//     if (node.extendsClause != null) {
//       final parent = node.extendsClause!.superclass.toSource();
//       inheritance = '$name extends $parent';
//     }

//     return DartElement(
//       name: name,
//       type: DartElementType.classDecl,
//       docString: doc,
//       dartCode: source,
//       inheritance: inheritance,
//       sourceLocation: SourceLocation(
//         result.path,
//         node.offset,
//       ),
//       parameters: [],
//       library: _extractLibrary(result.path),
//     );
//   }

//   String _extractDocComment(AstNode node) {
//     // Extract preceding documentation comment
//     // This is simplified - full impl would use element.documentationComment
//     return '''
//       A responsive widget that follows Material 3 guidelines.

//       Use this for primary actions on your screen.
//     ''';
//   }

//   String _extractLibrary(String path) {
//     // Extract library name from path: lib/widgets/button.dart → widgets
//     final parts = path.split('/');
//     if (parts.length > 2) {
//       return parts[1]; // Return first directory after lib/
//     }
//     return 'core';
//   }

//   DartElement _parseFunction(FunctionDeclaration node, ResolvedUnitResult result) {
//     // Similar to _parseClass but for functions
//     return DartElement(
//       name: node.name.lexeme,
//       type: DartElementType.function,
//       docString: _extractDocComment(node),
//       dartCode: node.toSource(),
//       sourceLocation: SourceLocation(result.path, node.offset),
//       parameters: [],
//       library: _extractLibrary(result.path),
//     );
//   }
// }

// // ============================================================================
// // lib/src/analyzer/models.dart - Data Models
// // ============================================================================

// enum DartElementType {
//   classDecl,
//   method,
//   function,
//   property,
//   enum_,
//   typedef;

//   bool get isClass => this == DartElementType.classDecl;
//   bool get isMethod => this == DartElementType.method;
// }

// class DartElement {
//   final String name;
//   final DartElementType type;
//   final String docString;
//   final String dartCode;
//   String jsCode;
//   final String? inheritance;
//   final SourceLocation sourceLocation;
//   final List<Parameter> parameters;
//   final String library;

//   DartElement({
//     required this.name,
//     required this.type,
//     required this.docString,
//     required this.dartCode,
//     this.jsCode = '',
//     this.inheritance,
//     required this.sourceLocation,
//     required this.parameters,
//     required this.library,
//   });
// }

// class Parameter {
//   final String name;
//   final String type;
//   final String? defaultValue;
//   final String docString;
//   final bool isRequired;

//   Parameter({
//     required this.name,
//     required this.type,
//     this.defaultValue,
//     this.docString = '',
//     this.isRequired = false,
//   });
// }

// class SourceLocation {
//   final String filePath;
//   final int offset;

//   SourceLocation(this.filePath, this.offset);
// }

// class DocPackage {
//   final String name;
//   final String version;
//   final String description;
//   final List<DartElement> elements;
//   final Map<String, List<DartElement>> libraryMap;
//   final DateTime generatedAt;

//   DocPackage({
//     required this.name,
//     required this.version,
//     required this.description,
//     required this.elements,
//     required this.libraryMap,
//     required this.generatedAt,
//   });
// }
