// ============================================================================
// ACTUALLY CORRECT: Using Real Dart Analyzer API (2025)
// ClassDeclaration.declaredFragment.element for ClassElement
// FunctionDeclaration.declaredElement for ExecutableElement
// ============================================================================

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/file_system/physical_file_system.dart';

/// Analyzer setup - CORRECT API
class AnalyzerWidgetDetectionSetup {
  late final AnalysisContextCollection collection;
  bool initialized = false;
  
  bool initialize(String projectRoot) {
    try {
      print('🔍 Initializing Analyzer for: $projectRoot');
      
      collection = AnalysisContextCollection(
        includedPaths: [projectRoot],
        resourceProvider: PhysicalResourceProvider.INSTANCE,
      );
      
      initialized = true;
      print('✅ Analyzer initialized successfully');
      return true;
    } catch (e) {
      print('❌ Analyzer initialization failed: $e');
      return false;
    }
  }
  
  /// Get resolved unit for a file
  Future<ResolvedUnitResult?> getResolvedUnit(String filePath) async {
    if (!initialized) {
      print('❌ Analyzer not initialized');
      return null;
    }
    
    try {
      final context = collection.contextFor(filePath);
      final result = await context.currentSession.getResolvedUnit(filePath);
      
      if (result is ResolvedUnitResult) {
        print('✅ Resolved: $filePath');
        return result;
      } else {
        print('❌ Resolution failed: $result');
        return null;
      }
    } catch (e) {
      print('❌ Exception during resolution: $e');
      return null;
    }
  }
}

/// Core widget detection - CORRECT API
class VerifiedWidgetDetection {
  
  /// Is this ClassElement a Widget?
  static bool isWidgetClass(ClassElement? classElement) {
    if (classElement == null) return false;
    
    print('   Checking class: ${classElement.name}');
    
    // Check superclass chain
    if (_checkSuperclassChain(classElement.supertype)) {
      print('   ✅ Found Widget in superclass chain');
      return true;
    }
    
    // Check interfaces
    for (final interface in classElement.interfaces) {
      if (_isWidgetType(interface)) {
        print('   ✅ Found Widget in interfaces');
        return true;
      }
    }
    
    // Check mixins
    for (final mixin in classElement.mixins) {
      if (_isWidgetType(mixin)) {
        print('   ✅ Found Widget in mixins');
        return true;
      }
    }
    
    print('   ❌ Not a Widget');
    return false;
  }
  
  /// Is this ExecutableElement a widget function?
  static bool isWidgetFunction(ExecutableElement? executableElement) {
    if (executableElement == null) return false;
    
    print('   Checking function: ${executableElement.name}');
    
    final returnType = executableElement.returnType;
    print('   Return type: ${returnType.getDisplayString(withNullability: true)}');
    
    if (returnType is InterfaceType) {
      final isWidget = _isWidgetType(returnType);
      if (isWidget) {
        print('   ✅ Returns Widget');
      } else {
        print('   ❌ Does not return Widget');
      }
      return isWidget;
    }
    
    print('   ❌ Return type is not InterfaceType');
    return false;
  }
  
  /// Check superclass chain
  static bool _checkSuperclassChain(InterfaceType? type) {
    while (type != null) {
      if (_isWidgetType(type)) {
        return true;
      }
      type = type.superclass;
    }
    return false;
  }
  
  /// Is this type a Widget?
  static bool _isWidgetType(InterfaceType type) {
    final element = type.element;
    final name = element.name;
    
    final coreWidgetTypes = {
      'Widget',
      'StatelessWidget',
      'StatefulWidget',
      'State',
      'RenderObjectWidget',
      'SingleChildRenderObjectWidget',
      'MultiChildRenderObjectWidget',
      'ParentDataWidget',
      'ProxyWidget',
      'InheritedWidget',
      'InheritedNotifier',
      'InheritedModel',
      'InheritedTheme',
    };
    
    if (coreWidgetTypes.contains(name)) {
      final libraryUri = element.library?.identifier ?? '';
      
      if (libraryUri.contains('package:flutter') || libraryUri == 'dart:ui') {
        print('   _isWidgetType: ✅ $name is a Flutter Widget');
        return true;
      }
    }
    
    // Recursively check superclass
    final supertype = type.superclass;
    if (supertype != null) {
      return _isWidgetType(supertype);
    }
    
    return false;
  }
}

/// Widget analysis pass - CORRECT API
class WidgetAnalysisPass {
  final AnalyzerWidgetDetectionSetup setup;
  final List<WidgetFound> foundWidgets = [];
  
  WidgetAnalysisPass({required this.setup});
  
  /// Analyze all files for widgets
  Future<void> analyzeFiles(List<String> filePaths) async {
    print('\n🔍 Analyzing ${filePaths.length} files for widgets...\n');
    
    for (final filePath in filePaths) {
      print('📄 Analyzing: $filePath');
      
      final resolved = await setup.getResolvedUnit(filePath);
      if (resolved == null) {
        print('   ⚠️  Could not resolve file\n');
        continue;
      }
      
      final compilationUnit = resolved.unit;
      
      // Analyze classes - CORRECT: Use declaredFragment?.element
      final classes = compilationUnit.declarations
          .whereType<ClassDeclaration>()
          .toList();
      
      print('   📦 Classes found: ${classes.length}');
      for (final classDecl in classes) {
        // CORRECT API: declaredFragment.element returns ClassElement
        final classElement = classDecl.declaredFragment?.element;
        
        if (VerifiedWidgetDetection.isWidgetClass(classElement)) {
          print('   ✅ Widget Class: ${classElement!.name}');
          
          final superclassName = classElement.supertype?.element.name ?? 'Object';
          final isStateful = superclassName == 'StatefulWidget';
          final isStateless = superclassName == 'StatelessWidget';
          
          // CORRECT API: Use formalParameters
          final List<String> constructorParams = classElement.constructors.isNotEmpty
              ? classElement.constructors.first.formalParameters
                  .map<String>((p) => p.name ?? '')
                  .where((name) => name.isNotEmpty)
                  .toList()
              : <String>[];
          
          foundWidgets.add(WidgetFound(
            name: classElement.name ?? '<unknown>',
            type: WidgetType.widgetClass,
            filePath: filePath,
            superclass: superclassName,
            isStateful: isStateful,
            isStateless: isStateless,
            parameters: constructorParams ,
          ));
          
          print('      - Superclass: $superclassName');
          print('      - Stateful: $isStateful, Stateless: $isStateless');
          print('      - Parameters: $constructorParams');
        }
      }
      
      // Analyze functions - CORRECT: declaredElement returns ExecutableElement
      final functions = compilationUnit.declarations
          .whereType<FunctionDeclaration>()
          .toList();
      
      print('   📦 Functions found: ${functions.length}');
      for (final funcDecl in functions) {
        // CORRECT API: declaredElement returns ExecutableElement directly
        final execElement = funcDecl.declaredFragment?.element;
        
        if (VerifiedWidgetDetection.isWidgetFunction(execElement)) {
          print('   ✅ Widget Function: ${execElement!.name}');
          
          // CORRECT API: Use formalParameters
          final params = execElement.formalParameters
              .map((p) => p.name ?? '')
              .where((name) => name.isNotEmpty)
              .toList();
          
          foundWidgets.add(WidgetFound(
            name: execElement.name ?? '<unknown>',
            type: WidgetType.widgetFunction,
            filePath: filePath,
            parameters: params,
          ));
          
          print('      - Parameters: $params');
        }
      }
      
      print('');
    }
    
    print('\n' + '='*60);
    print('📊 ANALYSIS SUMMARY');
    print('='*60);
    print('Total widgets found: ${foundWidgets.length}');
    
    final classes = foundWidgets.where((w) => w.type == WidgetType.widgetClass);
    final functions = foundWidgets.where((w) => w.type == WidgetType.widgetFunction);
    final stateful = classes.where((w) => w.isStateful).length;
    final stateless = classes.where((w) => w.isStateless).length;
    
    print('  - Widget Classes: ${classes.length} (Stateful: $stateful, Stateless: $stateless)');
    print('  - Widget Functions: ${functions.length}');
    print('='*60 + '\n');
  }
  
  void printReport() {
    print('\n📋 DETAILED WIDGET REPORT\n');
    
    final byType = <WidgetType, List<WidgetFound>>{};
    for (final widget in foundWidgets) {
      byType.putIfAbsent(widget.type, () => []).add(widget);
    }
    
    for (final entry in byType.entries) {
      print('${entry.key.toString().split('.').last}:');
      for (final widget in entry.value) {
        print('  ✅ ${widget.name}');
        if (widget.superclass != null) print('     extends: ${widget.superclass}');
        if (widget.isStateful) print('     ⚙️  Stateful');
        if (widget.isStateless) print('     🎨 Stateless');
        if (widget.parameters.isNotEmpty) print('     📋 params: ${widget.parameters}');
        print('     📁 ${widget.filePath}');
      }
      print('');
    }
  }
}

class WidgetFound {
  final String name;
  final WidgetType type;
  final String filePath;
  final String? superclass;
  final bool isStateful;
  final bool isStateless;
  final List<String> parameters;
  
  WidgetFound({
    required this.name,
    required this.type,
    required this.filePath,
    this.superclass,
    this.isStateful = false,
    this.isStateless = false,
    this.parameters = const [],
  });
}

enum WidgetType {
  widgetClass,
  widgetFunction,
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
Future<void> main() async {
  final setup = AnalyzerWidgetDetectionSetup();
  if (!setup.initialize('/path/to/flutter/project')) {
    print('❌ Failed to initialize analyzer');
    return;
  }
  
  final filePaths = [
    '/path/to/flutter/project/lib/main.dart',
    '/path/to/flutter/project/lib/screens/home.dart',
  ];
  
  final analysis = WidgetAnalysisPass(setup: setup);
  await analysis.analyzeFiles(filePaths);
  
  analysis.printReport();
}
*/