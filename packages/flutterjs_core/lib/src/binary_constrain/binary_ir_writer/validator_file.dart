import 'package:flutterjs_core/flutterjs_core.dart';
/// ============================================================================
/// validator_file.dart
/// IR Validator File — Entry Point for All Validation Systems in FlutterJS
/// ============================================================================
///
/// Acts as the **central hub** that coordinates all validation steps required
/// before IR is serialized to binary or converted to JavaScript.
///
/// While individual validators handle specific concerns:
/// - `binary_format_validator.dart` → binary structural correctness  
/// - `comprehensive_ir_validator.dart` → semantic IR correctness  
/// - relationship validation → cross-node graph integrity  
///
/// `validator_file.dart` provides a *single unified validation interface* used
/// throughout the pipeline.
///
///
/// # Purpose
///
/// FlutterJS IR must be validated thoroughly before:
/// - writing binary  
/// - decoding binary  
/// - exporting to JS  
/// - running UI analysis  
///
/// Invalid IR can lead to:
/// - corrupted builds  
/// - runtime errors  
/// - invalid JS output  
/// - broken widget trees  
///
/// This file ensures **all validation passes run in correct order**, forming
/// the final “gatekeeper” before serialization.
///
///
/// # Responsibilities
///
/// ## 1. Aggregate All Validators
///
/// The primary responsibility is to assemble all validation steps together:
///
/// ```dart
/// final binaryValidator = BinaryFormatValidator();
/// final irValidator = ComprehensiveIRValidator();
/// final relationshipValidator = RelationshipIntegrityValidator();
/// ```
///
///
/// ## 2. Provide a Single `.validate()` API
///
/// ```dart
/// void validate(IRRoot root, Uint8List? binaryBytes);
/// ```
///
/// Runs all validators in sequence:
/// - binary validation (if binary provided)  
/// - IR semantic validation  
/// - relationship consistency checks  
///
///
/// ## 3. Enforce Validation Ordering
///
/// Correct order is critical:
///
/// 1. Basic binary format checking  
/// 2. IR semantic checks  
/// 3. Relationship graph validation  
///
/// Failing to maintain order can hide or misattribute errors.
///
///
/// ## 4. Centralized Error Reporting
///
/// Collects errors from multiple validators and presents:
/// - merged diagnostics  
/// - normalized exception types  
/// - consistent error messages  
///
/// Example output:
/// ```
/// ValidationError:
///   - Missing declaration for variable 'count'
///   - Invalid type reference #12
///   - Relationship cycle detected at node #41
/// ```
///
///
/// ## 5. Optional Strict Mode
///
/// Some implementations support:
///
/// ```dart
/// enableStrictMode(); // forces aggressive validation
/// ```
///
/// Used during development or compiler debugging.
///
///
/// ## 6. Integration with the Build Pipeline
///
/// `validator_file.dart` is used by:
/// - the IR writer  
/// - the JS code generator  
/// - debug tooling  
/// - developer CLI tools (flutterjs_tools)  
///
/// Guarantees consistent validation across all environments.
///
///
/// # Example Usage
///
/// ```dart
/// final validator = CombinedIRValidator();
/// validator.validate(irRoot);
/// ```
///
/// or with binary:
///
/// ```dart
/// validator.validate(irRoot, binaryBytes);
/// ```
///
///
/// # Internal Components
///
/// Depends on:
/// - Binary format rules  
/// - String table integrity  
/// - Type table correctness  
/// - Expression validity  
/// - Declaration consistency  
/// - Relationship graph validation  
///
///
/// # Error Handling
///
/// Throws:
/// - `BinaryFormatException`  
/// - `IRValidationException`  
/// - `RelationshipValidationException`  
///
/// Or a merged exception wrapping multiple validation errors.
///
///
/// # Notes
///
/// - Must stay aligned with every IR schema update.  
/// - Extremely critical for build-time safety — do NOT bypass.  
/// - Should be lightweight when no errors are present.  
/// - Makes debugging IR errors significantly easier.  
///
///
/// ============================================================================
///

mixin ValidatorFile {
  // =========================================================================
  // VALIDATION (PRIORITY 2)
  // =========================================================================
  void printlog(String str);

  /// Enhanced validation before serialization
  List<String> validateFileIR(DartFile fileIR) {
    final errors = <String>[];

    // Basic file validation
    if (fileIR.filePath.isEmpty) {
      errors.add('FileIR.filePath is empty');
    } else if (fileIR.filePath.length > BinaryConstants.MAX_STRING_LENGTH) {
      errors.add('File path too long: ${fileIR.filePath.length} bytes');
    }

    if (fileIR.contentHash.isEmpty) {
      errors.add('FileIR.contentHash is empty');
    }

    // Validate collections aren't too large
    if (fileIR.classDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many classes: ${fileIR.classDeclarations.length}');
    }
    if (fileIR.functionDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many functions: ${fileIR.functionDeclarations.length}');
    }
    if (fileIR.variableDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many variables: ${fileIR.variableDeclarations.length}');
    }

    // Validate class declarations
    for (final classDecl in fileIR.classDeclarations) {
      if (classDecl.name.isEmpty) {
        errors.add('Class has empty name');
      } else if (classDecl.name.length > BinaryConstants.MAX_STRING_LENGTH) {
        errors.add('Class name too long: "${classDecl.name}"');
      }

      if (classDecl.fields.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Class ${classDecl.name} has too many fields');
      }
      if (classDecl.methods.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Class ${classDecl.name} has too many methods');
      }

      for (final field in classDecl.fields) {
        if (field.name.isEmpty) {
          errors.add('Field in class ${classDecl.name} has empty name');
        }
      }

      for (final method in classDecl.methods) {
        if (method.name.isEmpty) {
          errors.add('Method in class ${classDecl.name} has empty name');
        }
        if (method.parameters.length > BinaryConstants.MAX_ARRAY_COUNT) {
          errors.add(
            'Method ${classDecl.name}.${method.name} has too many parameters',
          );
        }
      }
    }

    // Validate function declarations
    for (final func in fileIR.functionDeclarations) {
      if (func.name.isEmpty) {
        errors.add('Function has empty name');
      } else if (func.name.length > BinaryConstants.MAX_STRING_LENGTH) {
        errors.add('Function name too long: "${func.name}"');
      }

      if (func.parameters.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Function ${func.name} has too many parameters');
      }
    }

    // Validate imports
    for (final import in fileIR.imports) {
      if (import.uri.isEmpty) {
        errors.add('Import has empty URI');
      }
      if (import.showList.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Import ${import.uri} has too many show items');
      }
    }

    return errors;
  }

  //   void validateBeforeWrite(String section, int expectedCount, String itemName) {
  //   printlog('[VALIDATE] Writing $expectedCount $itemName in [$section]');
  //   printlog('[VALIDATE] String table size: ${_stringTable.length}');
  //   printlog('[VALIDATE] Buffer offset: ${_buffer.length}');
  //   if (_verbose) {
  //     printlog('[VALIDATE] Last 5 strings in table:');
  //     for (int i = Math.max(0, _stringTable.length - 5); i < _stringTable.length; i++) {
  //       printlog('  [$i] "${_stringTable[i]}"');
  //     }
  //   }
  // }

  // // ✅ CALL THIS before writing classes
  // void debugBeforeClassesWrite(List<ClassDecl> classes) {
  //   printlog('\n[DEBUG PRE-CLASS WRITE]');
  //   printlog('Total classes to write: ${classes.length}');
  //   printlog('String table size: ${_stringTable.length}');
  //   printlog('Buffer offset: ${_buffer.length}');

  //   for (int i = 0; i < classes.length; i++) {
  //     final cls = classes[i];
  //     printlog('Class $i: ${cls.name}');
  //     printlog('  - id: ${cls.id}');
  //     printlog('  - fields: ${cls.fields.length}');
  //     printlog('  - methods: ${cls.methods.length}');
  //     printlog('  - constructors: ${cls.constructors.length}');
  //   }
  // }
}
