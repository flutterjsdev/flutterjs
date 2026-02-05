// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export 'src/pre_req_code_gen/init_project.dart';
export 'src/pre_req_code_gen/service_detection.dart';

export 'src/widget_generation/build_method/build_method_code_gen.dart';
export 'src/code_generation/class/class_code_generator.dart';
export 'src/code_generation/expression/expression_code_generator.dart';
export 'src/file_generation/file_code_gen.dart';
export 'src/code_generation/statement/statement_code_generator.dart';
export 'src/widget_generation/instantiation/widget_instantiation_code_gen.dart';
export 'src/widget_generation/prop_conversion/flutter_prop_converters.dart';
export 'src/code_generation/function/function_code_generator.dart';
export 'src/validation_optimization/output_validator.dart';

export 'src/widget_generation/stateless_widget/stateless_widget_js_code_gen.dart'
    hide FirstWhereOrNull;
export 'src/widget_generation/stateful_widget/stateful_widget_js_code_gen.dart'
    hide CodeGenError, WarningSeverity, CodeGenWarning;
export 'src/code_generation/special_features/special_language_features.dart';
export 'src/model_to_js_diagnostic.dart';
export 'src/model_to_js_integration.dart';
export 'src/validation_optimization/js_optimizer.dart';

export 'src/file_generation/runtime_requirements.dart';
