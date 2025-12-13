/**
 * FlutterJS Parser - Converts tokens to AST
 * Phase 1.2 MVP Implementation - FIXED
 * 
 * No external dependencies - pure Node.js
 */

import { TokenType } from './lexer.js';

// ============================================================================
// AST NODE CLASSES
// ============================================================================

class ASTNode {
  constructor(type, location) {
    this.type = type;
    this.location = location;
  }
}

class Program extends ASTNode {
  constructor(body = [], location = null) {
    super('Program', location);
    this.body = body;
  }
}

class ImportDeclaration extends ASTNode {
  constructor(specifiers = [], source = null, location = null) {
    super('ImportDeclaration', location);
    this.specifiers = specifiers;
    this.source = source;
  }
}

class ImportSpecifier extends ASTNode {
  constructor(imported = null, local = null, location = null) {
    super('ImportSpecifier', location);
    this.imported = imported;
    this.local = local;
  }
}

class ClassDeclaration extends ASTNode {
  constructor(id = null, superClass = null, body = null, location = null) {
    super('ClassDeclaration', location);
    this.id = id;
    this.superClass = superClass;
    this.body = body;
  }
}

class ClassBody extends ASTNode {
  constructor(fields = [], methods = [], location = null) {
    super('ClassBody', location);
    this.fields = fields;
    this.methods = methods;
  }
}

class FieldDeclaration extends ASTNode {
  constructor(key = null, initialValue = null, location = null) {
    super('FieldDeclaration', location);
    this.key = key;
    this.initialValue = initialValue;
  }
}

class MethodDeclaration extends ASTNode {
  constructor(key = null, params = [], body = null, location = null) {
    super('MethodDeclaration', location);
    this.key = key;
    this.params = params;
    this.body = body;
  }
}

class Parameter extends ASTNode {
  constructor(name = null, optional = false, defaultValue = null, location = null) {
    super('Parameter', location);
    this.name = name;
    this.optional = optional;
    this.defaultValue = defaultValue;
  }
}

class FunctionDeclaration extends ASTNode {
  constructor(id = null, params = [], body = null, isAsync = false, location = null) {
    super('FunctionDeclaration', location);
    this.id = id;
    this.params = params;
    this.body = body;
    this.isAsync = isAsync;
  }
}

class BlockStatement extends ASTNode {
  constructor(body = [], location = null) {
    super('BlockStatement', location);
    this.body = body;
  }
}

class ReturnStatement extends ASTNode {
  constructor(argument = null, location = null) {
    super('ReturnStatement', location);
    this.argument = argument;
  }
}

class ExpressionStatement extends ASTNode {
  constructor(expression = null, location = null) {
    super('ExpressionStatement', location);
    this.expression = expression;
  }
}

class Identifier extends ASTNode {
  constructor(name = '', location = null) {
    super('Identifier', location);
    this.name = name;
  }
}

class Literal extends ASTNode {
  constructor(value = null, raw = '', type = 'string', location = null) {
    super('Literal', location);
    this.value = value;
    this.raw = raw;
    this.literalType = type;
  }
}

class CallExpression extends ASTNode {
  constructor(callee = null, args = [], location = null) {
    super('CallExpression', location);
    this.callee = callee;
    this.args = args;
  }
}

class NewExpression extends ASTNode {
  constructor(callee = null, args = [], location = null) {
    super('NewExpression', location);
    this.callee = callee;
    this.args = args;
    this.isConst = false;
  }
}

class ObjectLiteral extends ASTNode {
  constructor(properties = [], location = null) {
    super('ObjectLiteral', location);
    this.properties = properties;
  }
}

class Property extends ASTNode {
  constructor(key = null, value = null, location = null) {
    super('Property', location);
    this.key = key;
    this.value = value;
    this.shorthand = false;
  }
}

class ArrowFunctionExpression extends ASTNode {
  constructor(params = [], body = null, location = null) {
    super('ArrowFunctionExpression', location);
    this.params = params;
    this.body = body;
  }
}

class MemberExpression extends ASTNode {
  constructor(object = null, property = null, computed = false, location = null) {
    super('MemberExpression', location);
    this.object = object;
    this.property = property;
    this.computed = computed;
  }
}

// ============================================================================
// PARSER CLASS
// ============================================================================

class Parser {
  constructor(tokens = [], options = {}) {
    this.tokens = tokens;
    this.current = 0;
    this.errors = [];
    this.options = { strict: false, ...options };
  }

  /**
   * Main entry point - parse tokens into AST
   */
  parse() {
    const body = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseTopLevel();
        if (stmt) {
          body.push(stmt);
        }
      } catch (error) {
        this.errors.push(error);
        this.synchronize();
      }
    }

    return new Program(body);
  }

  /**
   * Parse top-level statements
   */
  parseTopLevel() {
    if (this.isAtEnd()) return null;

    const token = this.peek();

    // Import statement
    if (this.isKeyword('import')) {
      this.advance();
      return this.parseImportDeclaration();
    }

    // Class declaration
    if (this.isKeyword('class')) {
      this.advance();
      return this.parseClassDeclaration();
    }

    // Function declaration
    if (this.isKeyword('function')) {
      this.advance();
      return this.parseFunctionDeclaration();
    }

    // Expression statement (const, variable assignment, etc)
    const expr = this.parseExpression();
    this.consumeStatementEnd();
    return new ExpressionStatement(expr, this.getLocation());
  }

  /**
   * Helper: Check if current token is a keyword with specific value
   */
  isKeyword(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.KEYWORD && token.value === value;
  }

  /**
   * Helper: Check if current is specific punctuation
   */
  isPunctuation(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.PUNCTUATION && token.value === value;
  }

  /**
   * Helper: Check if current is specific operator
   */
  isOperator(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.OPERATOR && token.value === value;
  }

  /**
   * Parse import: import { A, B } from '@pkg'
   */
  parseImportDeclaration() {
    const startLocation = this.getLocation();
    const specifiers = [];

    // import { A, B } from 'path'
    if (this.isPunctuation('{')) {
      this.advance();
      while (!this.isPunctuation('}') && !this.isAtEnd()) {
        const name = this.consume(TokenType.IDENTIFIER, 'Expected identifier').value;
        const imported = new Identifier(name);
        let local = imported;

        if (this.isKeyword('as')) {
          this.advance();
          const localName = this.consume(TokenType.IDENTIFIER, 'Expected identifier').value;
          local = new Identifier(localName);
        }

        specifiers.push(new ImportSpecifier(imported, local));

        if (!this.isPunctuation(',')) break;
        this.advance();
      }
      this.consume(TokenType.PUNCTUATION, 'Expected }');
    }

    this.consume(TokenType.KEYWORD, 'Expected from');
    const source = new Literal(
      this.consume(TokenType.STRING, 'Expected string').value,
      '',
      'string'
    );
    this.consumeStatementEnd();

    return new ImportDeclaration(specifiers, source, startLocation);
  }

  /**
   * Parse class declaration
   */
  parseClassDeclaration() {
    const startLocation = this.getLocation();
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected class name');
    const name = new Identifier(nameToken.value);

    let superClass = null;
    if (this.isKeyword('extends')) {
      this.advance();
      const superName = this.consume(TokenType.IDENTIFIER, 'Expected superclass name').value;
      superClass = new Identifier(superName);

      // Handle generics: State<Widget>
      if (this.isOperator('<')) {
        this.advance();
        this.consume(TokenType.IDENTIFIER, 'Expected type name');
        this.consume(TokenType.OPERATOR, 'Expected >');
      }
    }

    this.consume(TokenType.PUNCTUATION, 'Expected {');

    const fields = [];
    const methods = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      // Check what comes next
      if (this.check(TokenType.IDENTIFIER)) {
        const idToken = this.peek();
        const nextToken = this.peekAhead(1);

        // Method if followed by (
        if (nextToken && nextToken.type === TokenType.PUNCTUATION && nextToken.value === '(') {
          methods.push(this.parseMethodDeclaration());
        } else {
          // Field otherwise
          fields.push(this.parseFieldDeclaration());
        }
      } else {
        this.advance(); // Skip unknown tokens
      }
    }

    this.consume(TokenType.PUNCTUATION, 'Expected }');
    const body = new ClassBody(fields, methods);
    return new ClassDeclaration(name, superClass, body, startLocation);
  }

  /**
   * Parse method declaration
   */
  parseMethodDeclaration() {
    const startLocation = this.getLocation();
    const methodName = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;
    const key = new Identifier(methodName);

    this.consume(TokenType.PUNCTUATION, 'Expected (');
    const params = this.parseParameterList();
    this.consume(TokenType.PUNCTUATION, 'Expected )');

    let body = null;
    if (this.isOperator('=>')) {
      this.advance();
      body = this.parseExpression();
    } else if (this.isPunctuation('{')) {
      this.advance();
      body = this.parseBlock();
    }

    return new MethodDeclaration(key, params, body, startLocation);
  }

  /**
   * Parse field declaration
   */
  parseFieldDeclaration() {
    const startLocation = this.getLocation();
    const fieldName = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
    const key = new Identifier(fieldName);

    let initialValue = null;
    if (this.isOperator('=')) {
      this.advance();
      initialValue = this.parseExpression();
    }

    this.consumeStatementEnd();
    return new FieldDeclaration(key, initialValue, startLocation);
  }

  /**
   * Parse function declaration
   */
  parseFunctionDeclaration() {
    const startLocation = this.getLocation();
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected function name');
    const name = nameToken.value ? new Identifier(nameToken.value) : null;

    this.consume(TokenType.PUNCTUATION, 'Expected (');
    const params = this.parseParameterList();
    this.consume(TokenType.PUNCTUATION, 'Expected )');

    this.consume(TokenType.PUNCTUATION, 'Expected {');
    const body = this.parseBlock();

    return new FunctionDeclaration(name, params, body, false, startLocation);
  }

  /**
   * Parse parameter list
   */
  parseParameterList() {
    const params = [];

    while (!this.isPunctuation(')') && !this.isAtEnd()) {
      const paramLocation = this.getLocation();

      // Handle destructuring: { key = value }
      if (this.isPunctuation('{')) {
        this.advance();
        while (!this.isPunctuation('}') && !this.isAtEnd()) {
          const paramName = this.consume(TokenType.IDENTIFIER, 'Expected param name').value;
          let defaultValue = null;

          if (this.isOperator('=')) {
            this.advance();
            // Parse simple default value (literal or identifier)
            if (this.check(TokenType.IDENTIFIER)) {
              defaultValue = new Identifier(this.advance().value);
            } else if (this.check(TokenType.NUMBER)) {
              defaultValue = new Literal(parseFloat(this.advance().value), '', 'number');
            } else if (this.isKeyword('undefined')) {
              this.advance();
              defaultValue = new Literal(undefined, 'undefined', 'undefined');
            } else if (this.isKeyword('null')) {
              this.advance();
              defaultValue = new Literal(null, 'null', 'null');
            }
          }

          params.push(new Parameter(new Identifier(paramName), defaultValue !== null, defaultValue, paramLocation));

          if (!this.isPunctuation(',')) break;
          this.advance();
        }
        this.consume(TokenType.PUNCTUATION, 'Expected }');

        // Handle = {} or = { ... } after destructuring
        if (this.isOperator('=')) {
          this.advance();
          if (this.isPunctuation('{')) {
            this.advance();
            this.consume(TokenType.PUNCTUATION, 'Expected }');
          }
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Regular parameter
        const paramName = this.consume(TokenType.IDENTIFIER, 'Expected param name').value;
        let defaultValue = null;

        if (this.isOperator('=')) {
          this.advance();
          // Parse simple default value
          if (this.check(TokenType.IDENTIFIER)) {
            defaultValue = new Identifier(this.advance().value);
          } else if (this.check(TokenType.NUMBER)) {
            defaultValue = new Literal(parseFloat(this.advance().value), '', 'number');
          } else if (this.isKeyword('undefined')) {
            this.advance();
            defaultValue = new Literal(undefined, 'undefined', 'undefined');
          } else if (this.isKeyword('null')) {
            this.advance();
            defaultValue = new Literal(null, 'null', 'null');
          }
        }

        params.push(new Parameter(new Identifier(paramName), defaultValue !== null, defaultValue, paramLocation));
      } else {
        break;
      }

      if (!this.isPunctuation(',')) break;
      this.advance();
    }

    return params;
  }

  /**
   * Parse block statement
   */
  parseBlock() {
    const startLocation = this.getLocation();
    const statements = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      if (this.isKeyword('return')) {
        this.advance();
        let argument = null;
        if (!this.isPunctuation(';') && !this.isPunctuation('}')) {
          argument = this.parseExpression();
        }
        this.consumeStatementEnd();
        statements.push(new ReturnStatement(argument));
      } else {
        const expr = this.parseExpression();
        this.consumeStatementEnd();
        statements.push(new ExpressionStatement(expr));
      }
    }

    this.consume(TokenType.PUNCTUATION, 'Expected }');
    return new BlockStatement(statements, startLocation);
  }

  /**
   * Parse expression
   */
  parseExpression() {
    return this.parseAssignment();
  }

  /**
   * Parse assignment
   */
  parseAssignment() {
    let expr = this.parseTernary();

    if (this.isOperator('=')) {
      this.advance();
      const value = this.parseAssignment();
      return { type: 'AssignmentExpression', left: expr, right: value };
    }

    return expr;
  }

  /**
   * Parse ternary
   */
  parseTernary() {
    let expr = this.parseLogicalOr();

    if (this.isOperator('?')) {
      this.advance();
      const consequent = this.parseExpression();
      this.consume(TokenType.OPERATOR, 'Expected :');
      const alternate = this.parseExpression();
      return { type: 'ConditionalExpression', test: expr, consequent, alternate };
    }

    return expr;
  }

  /**
   * Parse logical OR
   */
  parseLogicalOr() {
    let expr = this.parseLogicalAnd();

    while (this.isOperator('||')) {
      this.advance();
      const right = this.parseLogicalAnd();
      expr = { type: 'LogicalExpression', operator: '||', left: expr, right };
    }

    return expr;
  }

  /**
   * Parse logical AND
   */
  parseLogicalAnd() {
    let expr = this.parseEquality();

    while (this.isOperator('&&')) {
      this.advance();
      const right = this.parseEquality();
      expr = { type: 'LogicalExpression', operator: '&&', left: expr, right };
    }

    return expr;
  }

  /**
   * Parse equality
   */
  parseEquality() {
    let expr = this.parseRelational();

    while (this.isOperator('===') || this.isOperator('!==') || this.isOperator('==') || this.isOperator('!=')) {
      const operator = this.advance().value;
      const right = this.parseRelational();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Parse relational
   */
  parseRelational() {
    let expr = this.parseAdditive();

    while (this.isOperator('<') || this.isOperator('>') || this.isOperator('<=') || this.isOperator('>=')) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Parse additive
   */
  parseAdditive() {
    let expr = this.parseMultiplicative();

    while (this.isOperator('+') || this.isOperator('-')) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Parse multiplicative
   */
  parseMultiplicative() {
    let expr = this.parseUnary();

    while (this.isOperator('*') || this.isOperator('/') || this.isOperator('%')) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Parse unary
   */
  parseUnary() {
    if (this.isOperator('!') || this.isOperator('-') || this.isOperator('+') || this.isOperator('~')) {
      const operator = this.advance().value;
      const expr = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument: expr };
    }

    return this.parsePostfix();
  }

  /**
   * Parse postfix (member access)
   */
  parsePostfix() {
    let expr = this.parseCall();

    while (true) {
      if (this.isPunctuation('.')) {
        this.advance();
        const property = new Identifier(this.consume(TokenType.IDENTIFIER, 'Expected property').value);
        expr = new MemberExpression(expr, property, false);
      } else if (this.isPunctuation('[')) {
        this.advance();
        const property = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, 'Expected ]');
        expr = new MemberExpression(expr, property, true);
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Parse function call
   */
  parseCall() {
    let expr = this.parsePrimary();

    while (this.isPunctuation('(')) {
      this.advance();
      const args = this.parseArguments();
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      expr = new CallExpression(expr, args);
    }

    return expr;
  }

  /**
   * Parse primary expression
   */
  parsePrimary() {
    // String literal
    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      return new Literal(token.value, token.value, 'string');
    }

    // Number literal
    if (this.check(TokenType.NUMBER)) {
      const token = this.advance();
      return new Literal(parseFloat(token.value), token.value, 'number');
    }

    // Boolean literal
    if (this.check(TokenType.BOOLEAN)) {
      const token = this.advance();
      return new Literal(token.value === 'true', token.value, 'boolean');
    }

    // null literal
    if (this.isKeyword('null')) {
      this.advance();
      return new Literal(null, 'null', 'null');
    }

    // undefined literal
    if (this.isKeyword('undefined')) {
      this.advance();
      return new Literal(undefined, 'undefined', 'undefined');
    }

    // Grouping or arrow function params: (...)
    if (this.isPunctuation('(')) {
      const savedPos = this.current;
      this.advance();

      // Try to parse as arrow function with multiple params: (a, b) => ...
      const potentialParams = [];
      let isArrowFunc = false;

      // Check if it looks like arrow function params
      if (this.isPunctuation(')') || this.check(TokenType.IDENTIFIER)) {
        let tempPos = this.current;
        let bracketDepth = 0;

        // Look ahead to see if we have => after )
        while (tempPos < this.tokens.length && !this.tokens[tempPos].type === TokenType.EOF) {
          const t = this.tokens[tempPos];
          if (t.type === TokenType.PUNCTUATION && t.value === '(') {
            bracketDepth++;
          } else if (t.type === TokenType.PUNCTUATION && t.value === ')') {
            if (bracketDepth === 0) {
              // Found the matching )
              if (tempPos + 1 < this.tokens.length && this.tokens[tempPos + 1].type === TokenType.OPERATOR && this.tokens[tempPos + 1].value === '=>') {
                isArrowFunc = true;
              }
              break;
            }
            bracketDepth--;
          }
          tempPos++;
        }
      }

      if (isArrowFunc) {
        // Parse arrow function params
        while (!this.isPunctuation(')') && !this.isAtEnd()) {
          const paramName = this.consume(TokenType.IDENTIFIER, 'Expected param name').value;
          potentialParams.push(new Parameter(new Identifier(paramName), false, null));
          if (!this.isPunctuation(',')) break;
          this.advance();
        }
        this.consume(TokenType.PUNCTUATION, 'Expected )');
        this.consume(TokenType.OPERATOR, 'Expected =>');
        const body = this.parseExpression();
        return new ArrowFunctionExpression(potentialParams, body);
      }

      // Not an arrow function, parse as grouped expression
      this.current = savedPos + 1;
      const expr = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      return expr;
    }

    // Object literal
    if (this.isPunctuation('{')) {
      this.advance();
      return this.parseObjectLiteral();
    }

    // Array literal
    if (this.isPunctuation('[')) {
      this.advance();
      const elements = [];
      while (!this.isPunctuation(']') && !this.isAtEnd()) {
        elements.push(this.parseExpression());
        if (!this.isPunctuation(',')) break;
        this.advance();
      }
      this.consume(TokenType.PUNCTUATION, 'Expected ]');
      return { type: 'ArrayLiteral', elements };
    }

    // new expression
    if (this.isKeyword('new')) {
      this.advance();
      const callee = new Identifier(this.consume(TokenType.IDENTIFIER, 'Expected class name').value);
      this.consume(TokenType.PUNCTUATION, 'Expected (');
      const args = this.parseArguments();
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      return new NewExpression(callee, args);
    }

    // const new expression
    if (this.isKeyword('const')) {
      const savedPos = this.current;
      this.advance();
      if (this.isKeyword('new')) {
        this.advance();
        const callee = new Identifier(this.consume(TokenType.IDENTIFIER, 'Expected class name').value);
        this.consume(TokenType.PUNCTUATION, 'Expected (');
        const args = this.parseArguments();
        this.consume(TokenType.PUNCTUATION, 'Expected )');
        const expr = new NewExpression(callee, args);
        expr.isConst = true;
        return expr;
      }
      // Not a new expression, backtrack
      this.current = savedPos;
    }

    // Identifier
    if (this.check(TokenType.IDENTIFIER)) {
      const token = this.advance();
      const ident = new Identifier(token.value);

      // Check for arrow function: name => expr
      if (this.isOperator('=>')) {
        this.advance();
        const body = this.parseExpression();
        return new ArrowFunctionExpression([new Parameter(ident)], body);
      }

      return ident;
    }

    throw this.error('Expected expression');
  }

  /**
   * Parse object literal
   */
  parseObjectLiteral() {
    const properties = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      let key = null;
      let shorthand = false;

      // Computed property: [expr]
      if (this.isPunctuation('[')) {
        this.advance();
        key = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, 'Expected ]');
      } else if (this.check(TokenType.IDENTIFIER)) {
        const token = this.advance();
        key = new Identifier(token.value);

        // Check for shorthand property: { name } instead of { name: value }
        if (this.isPunctuation(',') || this.isPunctuation('}')) {
          shorthand = true;
        }
      } else if (this.check(TokenType.STRING)) {
        const token = this.advance();
        key = new Literal(token.value, token.value, 'string');
      } else {
        // Skip unknown tokens and continue
        this.advance();
        continue;
      }

      let value = key;
      if (!shorthand) {
        if (!this.isPunctuation(':')) {
          // If no colon, treat as shorthand
          shorthand = true;
        } else {
          this.advance(); // consume :
          value = this.parseExpression();
        }
      }

      const prop = new Property(key, value);
      prop.shorthand = shorthand;
      properties.push(prop);

      if (!this.isPunctuation(',')) break;
      this.advance();
    }

    this.consume(TokenType.PUNCTUATION, 'Expected }');
    return new ObjectLiteral(properties);
  }

  /**
   * Parse function arguments
   */
  parseArguments() {
    const args = [];

    while (!this.isPunctuation(')') && !this.isAtEnd()) {
      args.push(this.parseExpression());
      if (!this.isPunctuation(',')) break;
      this.advance();
    }

    return args;
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  consume(type, message = '') {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(message || `Expected ${type}`);
  }

  consumeStatementEnd() {
    if (this.isPunctuation(';')) {
      this.advance();
    }
  }

  advance() {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  peek() {
    return this.tokens[this.current];
  }

  peekAhead(n = 1) {
    const pos = this.current + n;
    if (pos >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[pos];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  getLocation() {
    const token = this.peek();
    return { line: token.line, column: token.column };
  }

  error(message) {
    const token = this.peek();
    return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }

  synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.isPunctuation(';')) {
        this.advance();
        return;
      }
      if (this.isKeyword('class') || this.isKeyword('function') || this.isKeyword('import')) {
        return;
      }
      this.advance();
    }
  }

  getErrors() {
    return this.errors;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Parser,
  Program,
  ImportDeclaration,
  ImportSpecifier,
  ClassDeclaration,
  ClassBody,
  FieldDeclaration,
  MethodDeclaration,
  Parameter,
  FunctionDeclaration,
  BlockStatement,
  ReturnStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  CallExpression,
  NewExpression,
  ObjectLiteral,
  Property,
  ArrowFunctionExpression,
  MemberExpression,
  ASTNode,
};