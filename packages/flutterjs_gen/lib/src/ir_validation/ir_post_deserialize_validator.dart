// ============================================================================
// PHASE 0: PRE-ANALYSIS - IR TO JAVASCRIPT CONVERSION
// ============================================================================
// Validates and analyzes IR before code generation begins
// Uses actual predefined types from the codebase
// ============================================================================
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';

// ============================================================================
// error & REPORT CLASSES
// ============================================================================

// ============================================================================
// 0.1 IR POST-DESERIALIZATION VALIDATOR
// ============================================================================

class IRPostDeserializeValidator {
  final DartFile dartFile;
  final List<ValidationError> errors = [];
  IRPostDeserializeValidator(this.dartFile);

  ValidationReport validate() {
    final stopwatch = Stopwatch()..start();

    _checkStructuralIntegrity();
    _checkSemanticValidity();
    _checkCompletenessAfterDeser();
    _checkBinaryIntegrity();

    stopwatch.stop();

    return ValidationReport(
      errors: errors,
      duration: stopwatch.elapsed,
      canProceed: !errors.any((e) => e.severity == ErrorSeverity.fatal),
    );
  }

  void _checkStructuralIntegrity() {
    // 1. All class references are valid
    for (final cls in dartFile.classDeclarations) {
      if (cls.name.isEmpty) {
        _addError(
          'Class has empty name',
          ErrorSeverity.fatal,
          affectedNode: 'ClassDecl[${cls.id}]',
          suggestion: 'Ensure all classes have non-empty names',
        );
      }

      if (cls.superclass != null && cls.superclass!.displayName().isEmpty) {
        _addError(
          'Class superclass reference is invalid',
          ErrorSeverity.error,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Superclass type cannot be empty',
        );
      }

      // Validate methods
      for (final method in cls.methods) {
        if (method.name.isEmpty) {
          _addError(
            'Method in class ${cls.name} has empty name',
            ErrorSeverity.error,
            affectedNode: 'MethodDecl[${method.id}]',
          );
        }
      }

      // Validate fields
      for (final field in cls.fields) {
        if (field.name.isEmpty) {
          _addError(
            'Field in class ${cls.name} has empty name',
            ErrorSeverity.error,
            affectedNode: 'FieldDecl[${field.id}]',
          );
        }
      }

      // Validate constructors
      for (final ctor in cls.constructors) {
        if (ctor.constructorClass != cls.name) {
          _addError(
            'Constructor class mismatch: ${ctor.constructorClass} vs ${cls.name}',
            ErrorSeverity.warning,
            affectedNode: 'ConstructorDecl[${ctor.id}]',
          );
        }
      }
    }

    // 2. All function references are valid
    for (final func in dartFile.functionDeclarations) {
      if (func.name.isEmpty) {
        _addError(
          'Function has empty name',
          ErrorSeverity.fatal,
          affectedNode: 'FunctionDecl[${func.id}]',
        );
      }

      for (final param in func.parameters) {
        if (param.name.isEmpty) {
          _addError(
            'Parameter in function ${func.name} has empty name',
            ErrorSeverity.error,
            affectedNode: 'ParameterDecl[${param.id}]',
          );
        }
      }
    }

    // 3. Validate superclass consistency
    for (final cls in dartFile.classDeclarations) {
      if (cls.extendsClass && cls.isAbstract && cls.isSealed) {
        // Check semantic consistency
      }
    }

    // 4. Duplicate IDs check
    _checkDuplicateIds();
  }

  void _checkDuplicateIds() {
    final allIds = <String>{};

    for (final cls in dartFile.classDeclarations) {
      if (allIds.contains(cls.id)) {
        _addError(
          'Duplicate ID found: ${cls.id}',
          ErrorSeverity.error,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Each element must have a unique ID',
        );
      }
      allIds.add(cls.id);
    }

    for (final func in dartFile.functionDeclarations) {
      if (allIds.contains(func.id)) {
        _addError(
          'Duplicate ID found: ${func.id}',
          ErrorSeverity.error,
          affectedNode: 'FunctionDecl[${func.name}]',
        );
      }
      allIds.add(func.id);
    }
  }

  void _checkSemanticValidity() {
    // 1. No inheritance cycles
    _detectInheritanceCycles();

    // 2. Abstract methods in abstract classes
    _validateAbstractMethods();

    // 3. Type system consistency
    _checkTypeConsistency();

    // 4. Constructor validity
    _validateConstructors();
  }

  void _detectInheritanceCycles() {
    final classMap = {
      for (final cls in dartFile.classDeclarations) cls.name: cls,
    };

    for (final cls in dartFile.classDeclarations) {
      final visited = <String>{};
      if (_hasCycle(cls.name, classMap, visited)) {
        _addError(
          'Circular inheritance detected in class ${cls.name}',
          ErrorSeverity.fatal,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Remove circular inheritance',
        );
      }
    }
  }

  bool _hasCycle(
    String className,
    Map<String, ClassDecl> classMap,
    Set<String> visited,
  ) {
    if (visited.contains(className)) return true;
    if (!classMap.containsKey(className)) return false;

    visited.add(className);
    final cls = classMap[className]!;

    if (cls.superclass != null) {
      final parentName = cls.superclass!.displayName();
      if (_hasCycle(parentName, classMap, visited)) {
        return true;
      }
    }

    visited.remove(className);
    return false;
  }

  void _validateAbstractMethods() {
    for (final cls in dartFile.classDeclarations) {
      if (!cls.isAbstract) {
        // Non-abstract class cannot have abstract methods
        for (final method in cls.methods) {
          if (method.isAbstract) {
            _addError(
              'Non-abstract class ${cls.name} contains abstract method ${method.name}',
              ErrorSeverity.error,
              affectedNode: 'MethodDecl[${method.name}]',
              suggestion:
                  'Either mark class as abstract or provide implementation',
            );
          }
        }
      }
    }
  }

  void _checkTypeConsistency() {
    for (final cls in dartFile.classDeclarations) {
      // Validate method return types are properly set
      for (final method in cls.methods) {
        // Check method parameters have valid types
        for (final param in method.parameters) {
          if (param.type.displayName().isEmpty) {
            _addError(
              'Parameter ${param.name} in method ${method.name} has invalid type',
              ErrorSeverity.warning,
              affectedNode: 'ParameterDecl[${param.name}]',
            );
          }
        }
      }

      // Check field type names are meaningful
      for (final field in cls.fields) {
        final typeName = field.type.displayName();
        if (typeName.isEmpty) {
          _addError(
            'Field ${field.name} in class ${cls.name} has invalid type name',
            ErrorSeverity.warning,
            affectedNode: 'FieldDecl[${field.name}]',
          );
        }
      }
    }
  }

  void _validateConstructors() {
    for (final cls in dartFile.classDeclarations) {
      if (cls.constructors.isEmpty) {
        // OK - will generate default constructor
      } else {
        for (final ctor in cls.constructors) {
          if (ctor.isFactory && ctor.isConst) {
            _addError(
              'Constructor cannot be both factory and const',
              ErrorSeverity.error,
              affectedNode: 'ConstructorDecl[${ctor.id}]',
            );
          }
        }
      }
    }
  }

  void _checkCompletenessAfterDeser() {
    // Verify file metadata is present
    if (dartFile.filePath.isEmpty) {
      _addError(
        'DartFile has empty filePath',
        ErrorSeverity.error,
        suggestion: 'File must have a valid path',
      );
    }

    if (dartFile.contentHash.isEmpty) {
      _addError(
        'DartFile has empty contentHash',
        ErrorSeverity.warning,
        suggestion: 'Content hash should be computed for verification',
      );
    }
  }

  void _checkBinaryIntegrity() {
    // Check format version compatibility
    // This would be done during deserialization, but we can verify here

    // Verify timestamps are reasonable
    // Verify no data corruption indicators
  }

  void _addError(
    String message,
    ErrorSeverity severity, {
    String? suggestion,
    String? affectedNode,
  }) {
    errors.add(
      ValidationError(
        message: message,
        severity: severity,
        suggestion: suggestion,
        code: affectedNode,
      ),
    );
  }
}
