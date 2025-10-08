// lib/src/ir/file_ir.dart

import 'dart:typed_data';

import '../BinaryConstants/binary_constants.dart';
import '../analyzer/analying_project.dart';
import 'Statement/statement_ir.dart';
import 'widget/widget_ir.dart';

class FileIR {
  final String filePath;
  final List<WidgetIR> widgets;
  final List<StateClassIR> stateClasses;
  final List<FunctionIR> functions;
  final List<ProviderIR> providers;
  final List<ImportInfo> imports;
  final List<String> exports;

  FileIR({
    required this.filePath,
    required this.widgets,
    required this.stateClasses,
    required this.functions,
    required this.providers,
    required this.imports,
    required this.exports,
  });

  /// Serialize to binary format
  Uint8List toBinary() {
    // Use BinaryIRWriter but for single file
    final writer = BinaryIRWriter();
    return writer.writeFileIR(this);
  }

  /// Deserialize from binary format
  static FileIR fromBinary(Uint8List bytes) {
    final reader = BinaryIRReader();
    return reader.readFileIR(bytes);
  }
}