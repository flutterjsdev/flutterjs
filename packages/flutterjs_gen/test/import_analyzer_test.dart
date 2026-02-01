import 'package:flutterjs_gen/src/utils/import_analyzer.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:test/test.dart';

void main() {
  group('ImportAnalyzer', () {
    late ImportAnalyzer analyzer;

    setUp(() {
      analyzer = ImportAnalyzer();
    });

    SourceLocationIR mockLoc(String file) => SourceLocationIR(
      id: 'mock',
      file: file,
      line: 1,
      column: 1,
      offset: 0,
      length: 1,
    );

    test('correctly attributes symbols to relative imports', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      final clientType = ClassTypeIR(
        id: 'client_type',
        name: 'Client',
        className: 'Client',
        sourceLocation: mockLoc('/lib/http.dart'),
      );

      builder.addClass(
        ClassDecl(
          id: 'test_class',
          name: 'TestClass',
          sourceLocation: mockLoc('/lib/http.dart'),
          methods: [
            MethodDecl(
              id: 'test_method',
              name: 'testMethod',
              sourceLocation: mockLoc('/lib/http.dart'),
              parameters: [],
              returnType: PrimitiveTypeIR.void_(
                id: 'void_type',
                sourceLocation: mockLoc('/lib/http.dart'),
              ),
              body: FunctionBodyIR(
                id: 'body_1',
                sourceLocation: mockLoc('/lib/http.dart'),
                statements: [
                  VariableDeclarationStmt(
                    id: 'var_1',
                    sourceLocation: mockLoc('/lib/http.dart'),
                    name: 'client',
                    type: clientType,
                    initializer: InstanceCreationExpressionIR(
                      id: 'new_client',
                      sourceLocation: mockLoc('/lib/http.dart'),
                      type: clientType,
                      resultType: clientType,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/client.dart'], contains('Client'));
    });

    test('attributes symbols used in method parameters', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.addClass(
        ClassDecl(
          id: 'test_class',
          name: 'TestClass',
          sourceLocation: mockLoc('/lib/http.dart'),
          methods: [
            MethodDecl(
              id: 'test_method',
              name: 'testMethod',
              sourceLocation: mockLoc('/lib/http.dart'),
              parameters: [
                ParameterDecl(
                  id: 'param_1',
                  name: 'c',
                  type: ClassTypeIR(
                    id: 'client_type',
                    name: 'Client',
                    className: 'Client',
                    sourceLocation: mockLoc('/lib/http.dart'),
                  ),
                  sourceLocation: mockLoc('/lib/http.dart'),
                ),
              ],
              returnType: PrimitiveTypeIR.void_(
                id: 'void_type',
                sourceLocation: mockLoc('/lib/http.dart'),
              ),
              body: FunctionBodyIR(
                id: 'body_2',
                sourceLocation: mockLoc('/lib/http.dart'),
                statements: [],
              ),
            ),
          ],
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/client.dart'], contains('Client'));
    });

    test('does NOT attribute symbols in show list if NOT used in code', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/response.dart',
          showList: ['BaseResponse'],
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/response.dart'], isEmpty);
    });

    test('attributes symbols in show list IF used in code', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/response.dart',
          showList: ['BaseResponse'],
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.addVariable(
        VariableDecl(
          id: 'v1',
          name: 'r',
          type: ClassTypeIR(
            id: 't1',
            name: 'BaseResponse',
            className: 'BaseResponse',
            sourceLocation: mockLoc('/lib/http.dart'),
          ),
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/response.dart'], contains('BaseResponse'));
    });

    test('does NOT attribute symbols ONLY used in re-exports', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.addExport(
        ExportStmt(
          uri: 'src/client.dart',
          showList: ['Client'],
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/client.dart'], isEmpty);
    });

    test('prioritizes exact filename match over partial match', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');
      
      builder.addImport(ImportStmt(
        uri: 'src/base_client.dart',
        sourceLocation: mockLoc('/lib/http.dart'),
      ));
      builder.addImport(ImportStmt(
        uri: 'src/client.dart',
        sourceLocation: mockLoc('/lib/http.dart'),
      ));

      builder.addVariable(VariableDecl(
        id: 'v1',
        name: 'c',
        type: ClassTypeIR(id: 't1', name: 'Client', className: 'Client', sourceLocation: mockLoc('/lib/http.dart')),
        sourceLocation: mockLoc('/lib/http.dart'),
      ));

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      // Even if base_client.dart comes first, Client should match client.dart exactly
      expect(result['src/client.dart'], contains('Client'));
      expect(result['src/base_client.dart'], isEmpty);
    });

    test('handles URI normalization for relative paths', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');
      
      // Import uses ./ prefix
      builder.addImport(ImportStmt(
        uri: './src/client.dart',
        sourceLocation: mockLoc('/lib/http.dart'),
      ));

      builder.addVariable(VariableDecl(
        id: 'v1',
        name: 'c',
        type: ClassTypeIR(id: 't1', name: 'Client', className: 'Client', sourceLocation: mockLoc('/lib/http.dart')),
        sourceLocation: mockLoc('/lib/http.dart'),
      ));

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['./src/client.dart'], contains('Client'));
    });

    test('attributes symbols used in top-level variables', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.addVariable(
        VariableDecl(
          id: 'v_top',
          name: 'globalClient',
          type: ClassTypeIR(
            id: 't_c',
            name: 'Client',
            className: 'Client',
            sourceLocation: mockLoc('/lib/http.dart'),
          ),
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/client.dart'], contains('Client'));
    });

    test('attributes symbols used in TryStmt and ConstructorCallExpr', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      final clientType = ClassTypeIR(
        id: 'ct',
        name: 'Client',
        className: 'Client',
        sourceLocation: mockLoc('/lib/http.dart'),
      );

      builder.addFunction(
        FunctionDecl(
          id: 'f1',
          name: '_withClient',
          returnType: PrimitiveTypeIR.void_(
            id: 'r',
            sourceLocation: mockLoc('/lib/http.dart'),
          ),
          sourceLocation: mockLoc('/lib/http.dart'),
          body: FunctionBodyIR(
            id: 'b1',
            sourceLocation: mockLoc('/lib/http.dart'),
            statements: [
              VariableDeclarationStmt(
                id: 'v1',
                sourceLocation: mockLoc('/lib/http.dart'),
                name: 'client',
                initializer: ConstructorCallExpr(
                  id: 'c1',
                  className: 'Client',
                  sourceLocation: mockLoc('/lib/http.dart'),
                  resultType: clientType,
                ),
              ),
              TryStmt(
                id: 't1',
                sourceLocation: mockLoc('/lib/http.dart'),
                tryBlock: BlockStmt(
                  id: 'tb1',
                  sourceLocation: mockLoc('/lib/http.dart'),
                  statements: [
                    ReturnStmt(
                      id: 'r1',
                      sourceLocation: mockLoc('/lib/http.dart'),
                      expression: MethodCallExpr(
                        id: 'm1',
                        methodName: 'get',
                        sourceLocation: mockLoc('/lib/http.dart'),
                        resultType: PrimitiveTypeIR.void_(
                          id: 'r2',
                          sourceLocation: mockLoc('/lib/http.dart'),
                        ),
                        receiver: IdentifierExpressionIR(
                          id: 'id1',
                          name: 'client',
                          sourceLocation: mockLoc('/lib/http.dart'),
                          resultType: clientType,
                        ),
                      ),
                    ),
                  ],
                ),
                catchClauses: [],
                finallyBlock: BlockStmt(
                  id: 'fb1',
                  sourceLocation: mockLoc('/lib/http.dart'),
                  statements: [
                    ExpressionStmt(
                      id: 'es1',
                      sourceLocation: mockLoc('/lib/http.dart'),
                      expression: MethodCallExpr(
                        id: 'm2',
                        methodName: 'close',
                        sourceLocation: mockLoc('/lib/http.dart'),
                        resultType: PrimitiveTypeIR.void_(
                          id: 'r3',
                          sourceLocation: mockLoc('/lib/http.dart'),
                        ),
                        receiver: IdentifierExpressionIR(
                          id: 'id2',
                          name: 'client',
                          sourceLocation: mockLoc('/lib/http.dart'),
                          resultType: clientType,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      expect(result['src/client.dart'], contains('Client'));
    });

    test('does NOT attribute symbols if they are locally defined', () {
      final builder = DartFileBuilder(filePath: '/lib/http.dart');

      // 1. Add an import that *could* provide the symbol
      builder.addImport(
        ImportStmt(
          uri: 'src/client.dart',
          sourceLocation: mockLoc('/lib/http.dart'),
        ),
      );

      // 2. Define the symbol locally (e.g. _withClient)
      builder.addFunction(
        FunctionDecl(
          id: 'f_local',
          name: '_withClient',
          returnType: PrimitiveTypeIR.void_(
            id: 'void_t',
            sourceLocation: mockLoc('/lib/http.dart'),
          ),
          sourceLocation: mockLoc('/lib/http.dart'),
          body: FunctionBodyIR(
            id: 'b_local',
            sourceLocation: mockLoc('/lib/http.dart'),
            statements: [],
          ),
        ),
      );

      // 3. Use the symbol in code, with resolvedLibraryUri pointing to the import
      builder.addFunction(
        FunctionDecl(
          id: 'f_user',
          name: 'doSomething',
          returnType: PrimitiveTypeIR.void_(
            id: 'void_t2',
            sourceLocation: mockLoc('/lib/http.dart'),
          ),
          sourceLocation: mockLoc('/lib/http.dart'),
          body: FunctionBodyIR(
            id: 'b_user',
            sourceLocation: mockLoc('/lib/http.dart'),
            statements: [
              ReturnStmt(
                id: 'ret',
                sourceLocation: mockLoc('/lib/http.dart'),
                expression: FunctionCallExpr(
                  id: 'call',
                  functionName: '_withClient',
                  sourceLocation: mockLoc('/lib/http.dart'),
                  // Crucial: The resolved URI points to the IMPORT, mimicking the bug
                  resolvedLibraryUri: 'src/client.dart',
                  resultType: PrimitiveTypeIR.void_(
                    id: 'void_t3',
                    sourceLocation: mockLoc('/lib/http.dart'),
                  ),
                ),
              ),
            ],
          ),
        ),
      );

      builder.withContentHash('');
      final dartFile = builder.build();

      final result = analyzer.analyzeUsedSymbols(dartFile);

      // Should be empty because _withClient is local, so it shouldn't pull from import
      expect(result['src/client.dart'], isEmpty);
    });
  });
}
