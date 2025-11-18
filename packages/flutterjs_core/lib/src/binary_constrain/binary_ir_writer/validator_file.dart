import 'package:flutterjs_core/flutterjs_core.dart';

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
