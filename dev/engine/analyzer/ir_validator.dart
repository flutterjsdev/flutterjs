
// import 'analyze_flutter_app.dart';
// import 'type_registry.dart';


// class IRValidator {
//   final AnalyzeFlutterApp appIR;
//   final TypeRegistry typeRegistry;

//   IRValidator(this.appIR, this.typeRegistry);

//   ValidationResult validate() {
//     final errors = <String>[];

//     // Validate widgets
//     for (final widget in appIR.widgets) {
//       if (widget.name.isEmpty) {
//         errors.add('Widget has empty name at ${widget.filePath}');
//       }
//     }

//     // Validate state classes
//     for (final stateClass in appIR.stateClasses) {
//       if (stateClass.name.isEmpty) {
//         errors.add('State class has empty name at ${stateClass.filePath}');
//       }
//     }

//     // Validate providers
//     for (final provider in appIR.providers) {
//       if (provider.name.isEmpty) {
//         errors.add('Provider has empty name at ${provider.filePath}');
//       }
//     }

//     // Validate data models
//     for (final model in appIR.dataModels) {
//       if (model.name.isEmpty) {
//         errors.add('Data model has empty name at ${model.filePath}');
//       }
//     }

//     return ValidationResult(errors);
//   }
// }

// class ValidationResult {
//   final List<String> errors;

//   ValidationResult(this.errors);

//   bool get hasErrors => errors.isNotEmpty;
//   int get errorCount => errors.length;
// }