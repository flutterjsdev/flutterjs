import 'dart:io';
import 'package:path/path.dart' as path;

import '../binary_ir_reader/binary_ir_reader.dart';
import '../../ast_ir/dart_file_builder.dart';
import 'binary_format_validator.dart';

// ============================================================================
// INTEGRATED VALIDATION ORCHESTRATOR
// ============================================================================

class ComprehensiveIRValidator {
  final BinaryFormatValidator binaryValidator = BinaryFormatValidator();
  final SemanticValidator semanticValidator = SemanticValidator();
  final RoundTripValidator roundTripValidator = RoundTripValidator();
  final DifferentialTestValidator differentialValidator =
      DifferentialTestValidator();

  /// Run all four validation layers on IR files
  Future<ComprehensiveValidationReport> validateAllLayers({
    required String outputPath,
    required bool verbose,
  }) async {
    final report = ComprehensiveValidationReport();
    final irFiles = await _discoverIRFiles(outputPath);

    if (irFiles.isEmpty) {
      print('No IR files found in $outputPath');
      return report;
    }
    // Normalize output path for consistent relative path calculation
    final normalizedOutputPath = path.normalize(outputPath);

    print(
      '\n╔═══════════════════════════════════════════════════════════════╗',
    );
    print('║         COMPREHENSIVE IR VALIDATION - 4 LAYER APPROACH        ║');
    print('╚═══════════════════════════════════════════════════════════════╝');

    for (final irFile in irFiles) {
      // Calculate relative path from output directory
      final relativePath = path.relative(
        irFile.path,
        from: normalizedOutputPath,
      );

      print('\n\nValidating: $relativePath');
      print('─' * 60);

      final fileReport = await _validateSingleFile(
        irFile,
        relativePath: relativePath, // NEW: Pass relative path
        verbose: verbose,
      );
      report.addFileReport(fileReport);
    }

    // Print summary
    _printSummary(report, verbose);

    return report;
  }

  Future<IRFileValidationReport> _validateSingleFile(
    File irFile, {
    required bool verbose,
    required String relativePath, // NEW: Add this parameter
  }) async {
    final fileName = path.basename(irFile.path);
    final fileReport = IRFileValidationReport(
      fileName: fileName,
      relativePath: relativePath, // NEW: Store relative path in report
    );

    // Read binary data
    final bytes = await irFile.readAsBytes();

    // ===================================================================
    // LAYER 1: BINARY FORMAT VALIDATION
    // ===================================================================
    print('\n[LAYER 1/4] Binary Format & Integrity...');
    final binaryResult = await binaryValidator.validateBinaryIntegrity(
      bytes,
      relativePath,
    );
    binaryResult.printReport(verbose: verbose);
    fileReport.addResult(binaryResult);

    if (!binaryResult.isValid) {
      print('  ⚠️  Binary format invalid. Skipping remaining validation.');
      return fileReport;
    }

    // Deserialize to DartFile
    DartFile dartFile;
    try {
      final reader = BinaryIRReader();
      dartFile = reader.readFileIR(bytes, verbose: false);
    } catch (e) {
      print('  ✗ Deserialization failed: $e');
      return fileReport;
    }

    // ===================================================================
    // LAYER 2: SEMANTIC VALIDATION
    // ===================================================================
    print('\n[LAYER 2/4] Semantic Analysis...');
    final semanticResult = await semanticValidator.validateSemantics(dartFile);
    semanticResult.printReport(verbose: verbose);
    fileReport.addResult(semanticResult);

    // ===================================================================
    // LAYER 3: ROUND-TRIP VALIDATION
    // ===================================================================
    print('\n[LAYER 3/4] Round-Trip (IR → Dart → IR)...');
    final roundTripResult = await roundTripValidator.validateRoundTrip(
      dartFile,
      path.dirname(irFile.path),
    );
    roundTripResult.printReport(verbose: verbose);
    fileReport.addResult(roundTripResult);

    // ===================================================================
    // LAYER 4: DIFFERENTIAL TESTING
    // ===================================================================
    print('\n[LAYER 4/4] Differential Testing Against Known Structures...');
    final differentialResult = await differentialValidator
        .validateAgainstKnownStructures(dartFile);
    differentialResult.printReport(verbose: verbose);
    fileReport.addResult(differentialResult);

    return fileReport;
  }

  Future<List<File>> _discoverIRFiles(String outputPath) async {
    final dir = Directory(outputPath);
    if (!dir.existsSync()) {
      return [];
    }

    final irFiles = <File>[];
    await for (final entity in dir.list(recursive: true)) {
      if (entity is File && entity.path.endsWith('.ir')) {
        irFiles.add(entity);
      }
    }

    return irFiles;
  }

  void _printSummary(ComprehensiveValidationReport report, bool verbose) {
    print(
      '\n\n╔═════════════════════════════════════════════════════════════╗',
    );
    print(
      '║                    VALIDATION SUMMARY REPORT                    ║',
    );
    print('╚═════════════════════════════════════════════════════════════╝');

    final allValid = report.fileReports.every((r) => r.isValid);

    print('\n  Overall Status: ${allValid ? '✓ PASS' : '✗ FAIL'}');
    print('  Files validated: ${report.fileReports.length}');
    print('  Valid files: ${report.validFileCount}');
    print('  Invalid files: ${report.invalidFileCount}');

    if (report.totalErrors > 0) {
      print('\n  Errors by layer:');
      final errorsByLayer = report.errorsByLayer;
      for (final entry in errorsByLayer.entries) {
        print('    ${entry.key}: ${entry.value}');
      }
    }

    if (report.totalWarnings > 0 && verbose) {
      print('\n  Warnings by layer:');
      final warningsByLayer = report.warningsByLayer;
      for (final entry in warningsByLayer.entries) {
        print('    ${entry.key}: ${entry.value}');
      }
    }

    // NEW: Show files with issues
    if (report.fileReports.any((r) => !r.isValid)) {
      print('\n  Files with validation issues:');
      for (final fileReport in report.fileReports.where((r) => !r.isValid)) {
        print('    ✗ ${fileReport.relativePath}');
        for (final result in fileReport.results.where((r) => !r.isValid)) {
          print('      • ${result.stage}: ${result.errors.length} errors');
        }
      }
    }

    print('\n  Layer success rates:');
    final layerStats = report.layerSuccessRates;
    for (final entry in layerStats.entries) {
      final percentage = (entry.value * 100).toStringAsFixed(1);
      print('    ${entry.key}: $percentage%');
    }

    print('\n' + '=' * 65 + '\n');
  }
}

// ============================================================================
// REPORT STRUCTURES
// ============================================================================

class ComprehensiveValidationReport {
  final List<IRFileValidationReport> fileReports = [];

  void addFileReport(IRFileValidationReport report) {
    fileReports.add(report);
  }

  int get validFileCount => fileReports.where((r) => r.isValid).length;
  int get invalidFileCount => fileReports.where((r) => !r.isValid).length;

  int get totalErrors => fileReports.fold(0, (sum, r) => sum + r.totalErrors);
  int get totalWarnings =>
      fileReports.fold(0, (sum, r) => sum + r.totalWarnings);

  Map<String, int> get errorsByLayer {
    final map = <String, int>{};
    for (final report in fileReports) {
      for (final result in report.results) {
        map.update(
          result.stage,
          (v) => v + result.errors.length,
          ifAbsent: () => result.errors.length,
        );
      }
    }
    return map;
  }

  Map<String, int> get warningsByLayer {
    final map = <String, int>{};
    for (final report in fileReports) {
      for (final result in report.results) {
        map.update(
          result.stage,
          (v) => v + result.warnings.length,
          ifAbsent: () => result.warnings.length,
        );
      }
    }
    return map;
  }

  Map<String, double> get layerSuccessRates {
    final layers = <String, List<bool>>{};

    for (final report in fileReports) {
      for (final result in report.results) {
        layers.putIfAbsent(result.stage, () => []);
        layers[result.stage]!.add(result.isValid);
      }
    }

    final rates = <String, double>{};
    for (final entry in layers.entries) {
      final validCount = entry.value.where((v) => v).length;
      rates[entry.key] = validCount / entry.value.length;
    }

    return rates;
  }
}

class IRFileValidationReport {
  final String fileName;
  final String relativePath; // NEW: Add this field
  final List<ValidationResult> results = [];

  IRFileValidationReport({
    required this.fileName,
    required this.relativePath, // NEW: Add to constructor
  });

  void addResult(ValidationResult result) {
    results.add(result);
  }

  bool get isValid => results.every((r) => r.isValid);
  int get totalErrors => results.fold(0, (sum, r) => sum + r.errors.length);
  int get totalWarnings => results.fold(0, (sum, r) => sum + r.warnings.length);

  void printReport({bool verbose = false}) {
    print('\n  File: $relativePath'); // CHANGED: Use relative path
    print('    Status: ${isValid ? '✓ VALID' : '✗ INVALID'}');
    print('    Layers tested: ${results.length}/4');

    for (final result in results) {
      final status = result.isValid ? '✓' : '✗';
      print('      $status ${result.stage}');

      if (result.errors.isNotEmpty) {
        for (final error in result.errors) {
          print('        ERROR: $error');
        }
      }

      if (result.warnings.isNotEmpty && verbose) {
        for (final warning in result.warnings) {
          print('        WARNING: $warning');
        }
      }
    }
  }
}
