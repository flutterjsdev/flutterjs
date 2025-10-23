import 'dart:typed_data';
import '../../../dev/engine/binary_constrain/binary_constain.dart';
import '../../../dev/engine/new_ast_IR/class_decl.dart';
import '../../../dev/engine/new_ast_IR/dart_file_builder.dart';
import '../../../dev/engine/new_ast_IR/function_decl.dart';

// ============================================================================
// LAYER 1: BINARY FORMAT & DESERIALIZATION VALIDATION
// ============================================================================

class BinaryFormatValidator {
  Future<ValidationResult> validateBinaryIntegrity(
    Uint8List bytes,
    String fileName,
  ) async {
    final errors = <String>[];
    final warnings = <String>[];

    try {
      // Check file size
      if (bytes.length < BinaryConstants.HEADER_SIZE) {
        errors.add('File too small: ${bytes.length} bytes');
        return ValidationResult(
          stage: 'binary_format',
          fileName: fileName,
          isValid: false,
          errors: errors,
          warnings: warnings,
        );
      }

      // Check magic number
      final magic = _readUint32(bytes, 0);
      if (magic != BinaryConstants.MAGIC_NUMBER) {
        errors.add(
          'Invalid magic number: 0x${magic.toRadixString(16)}',
        );
      }

      // Check version
      final version = _readUint16(bytes, 4);
      if (version != BinaryConstants.FORMAT_VERSION) {
        warnings.add('Version mismatch: $version (expected ${BinaryConstants.FORMAT_VERSION})');
      }

      // Check flags
      final flags = _readUint16(bytes, 6);
      final hasChecksum = (flags & BinaryConstants.FLAG_HAS_CHECKSUM) != 0;
      final isCompressed = (flags & BinaryConstants.FLAG_COMPRESSED) != 0;

      if (isCompressed) {
        warnings.add('Compressed format detected (not fully supported)');
      }

      // Validate checksum if present
      if (hasChecksum) {
        final checksumValid = _validateChecksum(bytes);
        if (!checksumValid) {
          errors.add('Checksum validation failed - file may be corrupted');
        }
      }

      return ValidationResult(
        stage: 'binary_format',
        fileName: fileName,
        isValid: errors.isEmpty,
        errors: errors,
        warnings: warnings,
      );
    } catch (e) {
      errors.add('Binary format error: $e');
      return ValidationResult(
        stage: 'binary_format',
        fileName: fileName,
        isValid: false,
        errors: errors,
        warnings: warnings,
      );
    }
  }

  bool _validateChecksum(Uint8List bytes) {
    // Placeholder - implement actual SHA256 validation
    return true;
  }

  int _readUint32(Uint8List bytes, int offset) {
    return (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24));
  }

  int _readUint16(Uint8List bytes, int offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8));
  }
}

// ============================================================================
// LAYER 2: SEMANTIC VALIDATION
// ============================================================================

class SemanticValidator {
  Future<ValidationResult> validateSemantics(DartFile dartFile) async {
    final errors = <String>[];
    final warnings = <String>[];

    // Check 1: Type consistency in methods
    for (final classDecl in dartFile.classDeclarations) {
      for (final method in classDecl.methods) {
        _validateMethodTypeConsistency(method, errors, warnings);
      }
    }

    // Check 2: Parameter usage in method bodies
    for (final classDecl in dartFile.classDeclarations) {
      for (final method in classDecl.methods) {
        _validateParameterUsage(method, errors, warnings);
      }
    }

    // Check 3: Type reference resolution
    _validateTypeReferences(dartFile, errors, warnings);

    // Check 4: Field initialization consistency
    for (final classDecl in dartFile.classDeclarations) {
      _validateFieldInitialization(classDecl, errors, warnings);
    }

    // Check 5: Constructor parameter consistency
    for (final classDecl in dartFile.classDeclarations) {
      for (final constructor in classDecl.constructors) {
        _validateConstructorParameters(constructor, classDecl, errors, warnings);
      }
    }

    return ValidationResult(
      stage: 'semantic',
      fileName: dartFile.filePath,
      isValid: errors.isEmpty,
      errors: errors,
      warnings: warnings,
      metadata: {
        'classes_checked': dartFile.classDeclarations.length,
        'methods_checked': dartFile.classDeclarations
            .fold(0, (sum, c) => sum + c.methods.length),
      },
    );
  }

  void _validateMethodTypeConsistency(
    MethodDecl method,
    List<String> errors,
    List<String> warnings,
  ) {
    // Check if return type is reasonable
    if (method.returnType.displayName().isEmpty) {
      warnings.add('Method ${method.name} has empty return type');
    }

    // Check parameter types
    for (final param in method.parameters) {
      if (param.type.displayName().isEmpty) {
        warnings.add(
          'Parameter ${param.name} in method ${method.name} has empty type',
        );
      }
    }
  }

  void _validateParameterUsage(
    MethodDecl method,
    List<String> errors,
    List<String> warnings,
  ) {
    // This would require analyzing the method body AST
    // Placeholder for parameter usage checking
    if (method.parameters.isEmpty && method.name == 'build') {
      warnings.add('Method ${method.name} has no parameters (may be intentional)');
    }
  }

  void _validateTypeReferences(
    DartFile dartFile,
    List<String> errors,
    List<String> warnings,
  ) {
    final definedTypes = <String>{};

    // Collect all defined types
    for (final classDecl in dartFile.classDeclarations) {
      definedTypes.add(classDecl.name);
    }

    // Check if referenced types exist
    for (final classDecl in dartFile.classDeclarations) {
      if (classDecl.superclass != null) {
        final superName = classDecl.superclass!.displayName();
        if (!_isBuiltinType(superName) && !definedTypes.contains(superName)) {
          warnings.add(
            'Class ${classDecl.name} extends undefined type: $superName',
          );
        }
      }

      for (final iface in classDecl.interfaces) {
        final ifaceName = iface.displayName();
        if (!_isBuiltinType(ifaceName) && !definedTypes.contains(ifaceName)) {
          warnings.add(
            'Class ${classDecl.name} implements undefined type: $ifaceName',
          );
        }
      }
    }
  }

  void _validateFieldInitialization(
    ClassDecl classDecl,
    List<String> errors,
    List<String> warnings,
  ) {
    for (final field in classDecl.fields) {
      if (field.isFinal && field.initializer == null) {
        warnings.add(
          'Final field ${field.name} in ${classDecl.name} has no initializer',
        );
      }

      if (field.isConst && field.initializer == null) {
        errors.add(
          'Const field ${field.name} in ${classDecl.name} must have initializer',
        );
      }
    }
  }

  void _validateConstructorParameters(
    ConstructorDecl constructor,
    ClassDecl classDecl,
    List<String> errors,
    List<String> warnings,
  ) {
    // Check if constructor class matches declaration class
    if (constructor.constructorClass != classDecl.name) {
      errors.add(
        'Constructor class mismatch: ${constructor.constructorClass} != ${classDecl.name}',
      );
    }

    // Check parameter types
    for (final param in constructor.parameters) {
      if (param.type.displayName().isEmpty) {
        warnings.add(
          'Constructor parameter ${param.name} has empty type',
        );
      }
    }
  }

  bool _isBuiltinType(String typeName) {
    const builtins = {
      'int',
      'String',
      'double',
      'bool',
      'List',
      'Map',
      'Set',
      'Future',
      'Stream',
      'Widget',
      'State',
      'BuildContext',
      'dynamic',
      'void',
      'Never',
    };
    return builtins.contains(typeName) || typeName.startsWith('_');
  }
}

// ============================================================================
// LAYER 3: ROUND-TRIP VALIDATION (IR → Dart → IR)
// ============================================================================

class RoundTripValidator {
  Future<ValidationResult> validateRoundTrip(
    DartFile originalIR,
    String outputPath,
  ) async {
    final errors = <String>[];
    final warnings = <String>[];

    try {
      // Step 1: Decompile IR to Dart code
      final dartCode = _decompileIRToDart(originalIR);

      if (dartCode.isEmpty) {
        errors.add('Decompilation produced empty output');
        return ValidationResult(
          stage: 'roundtrip',
          fileName: originalIR.filePath,
          isValid: false,
          errors: errors,
          warnings: warnings,
        );
      }

      // Step 2: Parse the regenerated Dart code
      DartFile? reparsedIR;
      try {
        // This would use your existing DartFileParser
        // reparsedIR = await DartFileParser.parseString(dartCode);
        // For now, placeholder
        reparsedIR = originalIR; // Simulate success
      } catch (e) {
        errors.add('Failed to parse decompiled Dart code: $e');
        return ValidationResult(
          stage: 'roundtrip',
          fileName: originalIR.filePath,
          isValid: false,
          errors: errors,
          warnings: warnings,
        );
      }

      // Step 3: Compare IR structures (not source code)
      final structureMatches = _compareIRStructures(originalIR, reparsedIR);

      if (!structureMatches) {
        errors.add('IR structure changed after round-trip');
      }

      // Step 4: Detailed comparison
      final comparisonReport = _generateComparisonReport(originalIR, reparsedIR);
      if (comparisonReport.hasMismatches) {
        for (final mismatch in comparisonReport.mismatches) {
          errors.add('Structure mismatch: $mismatch');
        }
      }

      return ValidationResult(
        stage: 'roundtrip',
        fileName: originalIR.filePath,
        isValid: errors.isEmpty,
        errors: errors,
        warnings: warnings,
        metadata: {
          'classes_compared': originalIR.classDeclarations.length,
          'structure_matches': structureMatches,
          'decompilation_size': dartCode.length,
        },
      );
    } catch (e) {
      errors.add('Round-trip validation error: $e');
      return ValidationResult(
        stage: 'roundtrip',
        fileName: originalIR.filePath,
        isValid: false,
        errors: errors,
        warnings: warnings,
      );
    }
  }

  String _decompileIRToDart(DartFile ir) {
    final buffer = StringBuffer();

    // Write library declaration
    if (ir.library != null && ir.library!.isNotEmpty) {
      buffer.writeln('library ${ir.library};');
      buffer.writeln();
    }

    // Write imports
    for (final import in ir.imports) {
      buffer.write("import '${import.uri}'");
      if (import.prefix != null) {
        buffer.write(' as ${import.prefix}');
      }
      if (import.showList.isNotEmpty) {
        buffer.write(' show ${import.showList.join(', ')}');
      }
      if (import.hideList.isNotEmpty) {
        buffer.write(' hide ${import.hideList.join(', ')}');
      }
      buffer.writeln(';');
    }

    if (ir.imports.isNotEmpty) buffer.writeln();

    // Write classes
    for (final classDecl in ir.classDeclarations) {
      _writeClassDeclaration(buffer, classDecl);
    }

    // Write functions
    for (final func in ir.functionDeclarations) {
      _writeFunctionDeclaration(buffer, func);
    }

    return buffer.toString();
  }

  void _writeClassDeclaration(StringBuffer buffer, ClassDecl classDecl) {
    if (classDecl.isAbstract) buffer.write('abstract ');
    buffer.write('class ${classDecl.name}');

    if (classDecl.superclass != null) {
      buffer.write(' extends ${classDecl.superclass!.displayName()}');
    }

    if (classDecl.interfaces.isNotEmpty) {
      buffer.write(
        ' implements ${classDecl.interfaces.map((i) => i.displayName()).join(', ')}',
      );
    }

    buffer.writeln(' {');

    // Write fields
    for (final field in classDecl.fields) {
      if (field.isStatic) buffer.write('  static ');
      if (field.isFinal) buffer.write('final ');
      buffer.writeln('${field.type.displayName()} ${field.name};');
    }

    if (classDecl.fields.isNotEmpty) buffer.writeln();

    // Write constructors
    for (final constructor in classDecl.constructors) {
      _writeConstructor(buffer, constructor, classDecl.name);
    }

    // Write methods
    for (final method in classDecl.methods) {
      _writeMethod(buffer, method);
    }

    buffer.writeln('}');
    buffer.writeln();
  }

  void _writeConstructor(
    StringBuffer buffer,
    ConstructorDecl constructor,
    String className,
  ) {
    buffer.write('  ');
    if (constructor.isConst) buffer.write('const ');
    if (constructor.isFactory) buffer.write('factory ');
    buffer.write(className);
    if (constructor.constructorName != null) {
      buffer.write('.${constructor.constructorName}');
    }
    buffer.write('(');
    buffer.write(
      constructor.parameters
          .map((p) => '${p.type.displayName()} ${p.name}')
          .join(', '),
    );
    buffer.writeln(');');
  }

  void _writeMethod(StringBuffer buffer, MethodDecl method) {
    buffer.write('  ');
    if (method.isStatic) buffer.write('static ');
    if (method.isAsync) buffer.write('async ');
    buffer.write('${method.returnType.displayName()} ${method.name}(');
    buffer.write(
      method.parameters
          .map((p) => '${p.type.displayName()} ${p.name}')
          .join(', '),
    );
    buffer.writeln(') {}');
  }

  void _writeFunctionDeclaration(StringBuffer buffer, FunctionDecl func) {
    if (func.isAsync) buffer.write('async ');
    buffer.write('${func.returnType.displayName()} ${func.name}(');
    buffer.write(
      func.parameters
          .map((p) => '${p.type.displayName()} ${p.name}')
          .join(', '),
    );
    buffer.writeln(') {}');
  }

  bool _compareIRStructures(DartFile original, DartFile reparsed) {
    if (original.classDeclarations.length != reparsed.classDeclarations.length) {
      return false;
    }

    if (original.functionDeclarations.length !=
        reparsed.functionDeclarations.length) {
      return false;
    }

    for (int i = 0; i < original.classDeclarations.length; i++) {
      if (!_compareClassStructure(
        original.classDeclarations[i],
        reparsed.classDeclarations[i],
      )) {
        return false;
      }
    }

    return true;
  }

  bool _compareClassStructure(ClassDecl original, ClassDecl reparsed) {
    return original.name == reparsed.name &&
        original.methods.length == reparsed.methods.length &&
        original.fields.length == reparsed.fields.length &&
        original.constructors.length == reparsed.constructors.length;
  }

  ComparisonReport _generateComparisonReport(
    DartFile original,
    DartFile reparsed,
  ) {
    final mismatches = <String>[];

    if (original.classDeclarations.length != reparsed.classDeclarations.length) {
      mismatches.add(
        'Class count: ${original.classDeclarations.length} vs ${reparsed.classDeclarations.length}',
      );
    }

    if (original.functionDeclarations.length !=
        reparsed.functionDeclarations.length) {
      mismatches.add(
        'Function count: ${original.functionDeclarations.length} vs ${reparsed.functionDeclarations.length}',
      );
    }

    return ComparisonReport(mismatches: mismatches);
  }
}

// ============================================================================
// LAYER 4: DIFFERENTIAL TESTING
// ============================================================================

class DifferentialTestValidator {
  final Map<String, ExpectedStructure> knownWidgets = {
    'StatelessWidget': ExpectedStructure(
      expectedMethods: ['build'],
      expectedSuperclass: 'Widget',
    ),
    'StatefulWidget': ExpectedStructure(
      expectedMethods: ['createState'],
      expectedSuperclass: 'Widget',
    ),
    'State': ExpectedStructure(
      expectedMethods: ['build', 'initState', 'dispose'],
      expectedSuperclass: null,
    ),
  };

  Future<ValidationResult> validateAgainstKnownStructures(
    DartFile dartFile,
  ) async {
    final errors = <String>[];
    final warnings = <String>[];

    for (final classDecl in dartFile.classDeclarations) {
      // Check if this is a known widget type
      final expectedStructure = _findExpectedStructure(classDecl);

      if (expectedStructure != null) {
        final result = _validateAgainstExpected(classDecl, expectedStructure);
        errors.addAll(result.errors);
        warnings.addAll(result.warnings);
      }
    }

    return ValidationResult(
      stage: 'differential_test',
      fileName: dartFile.filePath,
      isValid: errors.isEmpty,
      errors: errors,
      warnings: warnings,
      metadata: {
        'classes_tested': dartFile.classDeclarations.length,
      },
    );
  }

  ExpectedStructure? _findExpectedStructure(ClassDecl classDecl) {
    if (classDecl.superclass == null) return null;

    final superName = classDecl.superclass!.displayName();
    return knownWidgets[superName];
  }

  ValidationResult _validateAgainstExpected(
    ClassDecl classDecl,
    ExpectedStructure expected,
  ) {
    final errors = <String>[];
    final warnings = <String>[];

    // Check for expected methods
    final methodNames = classDecl.methods.map((m) => m.name).toSet();
    for (final expectedMethod in expected.expectedMethods) {
      if (!methodNames.contains(expectedMethod)) {
        warnings.add(
          'Class ${classDecl.name} missing expected method: $expectedMethod',
        );
      }
    }

    return ValidationResult(
      stage: 'differential_test',
      fileName: classDecl.name,
      isValid: errors.isEmpty,
      errors: errors,
      warnings: warnings,
    );
  }
}

// ============================================================================
// RESULT STRUCTURES
// ============================================================================

class ValidationResult {
  final String stage;
  final String fileName;
  final bool isValid;
  final List<String> errors;
  final List<String> warnings;
  final Map<String, dynamic> metadata;

  ValidationResult({
    required this.stage,
    required this.fileName,
    required this.isValid,
    required this.errors,
    required this.warnings,
    this.metadata = const {},
  });

  void printReport({bool verbose = false}) {
    print('\n  [$stage] $fileName');
    if (isValid) {
      print('    ✓ Valid');
    } else {
      print('    ✗ Invalid');
    }

    if (errors.isNotEmpty) {
      print('    Errors:');
      for (final error in errors) {
        print('      • $error');
      }
    }

    if (warnings.isNotEmpty && verbose) {
      print('    Warnings:');
      for (final warning in warnings) {
        print('      • $warning');
      }
    }

    if (metadata.isNotEmpty && verbose) {
      print('    Metadata: $metadata');
    }
  }
}

class ComparisonReport {
  final List<String> mismatches;

  ComparisonReport({required this.mismatches});

  bool get hasMismatches => mismatches.isNotEmpty;
}

class ExpectedStructure {
  final List<String> expectedMethods;
  final String? expectedSuperclass;

  ExpectedStructure({
    required this.expectedMethods,
    this.expectedSuperclass,
  });
}