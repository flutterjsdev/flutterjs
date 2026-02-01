import 'package:test/test.dart';
import 'package:flutterjs_gen/src/code_generation/expression/expression_code_generator.dart';
import 'package:flutterjs_core/flutterjs_core.dart';

void main() {
  group('ExpressionCodeGen Repro', () {
    late ExpressionCodeGen gen;

    setUp(() {
      gen = ExpressionCodeGen();
    });

    test('should correctly transpile IIFE with closure', () {
      final expr = UnknownExpressionIR('(() { return 1; })()');
      final result = gen.generate(expr);
      
      // The current bug causes it to produce: (() ) => { return 1; })()
      // Which is invalid JS. We want: (() => { return 1; })()
      expect(result, contains('=>'));
      expect(result, isNot(contains('() ) =>')));
      expect(result, equals('(() => { return 1; })()'));
    });

    test('should correctly transpile closure with parameters', () {
      final expr = UnknownExpressionIR('(a, b) { return a + b; }');
      final result = gen.generate(expr);
      expect(result, equals('(a, b) => { return a + b; }'));
    });
    
    test('should not break control flow statements', () {
      final expr = UnknownExpressionIR('if (x) { return 1; }');
      final result = gen.generate(expr);
      expect(result, equals('if (x) { return 1; }'));
    });
  });
}
