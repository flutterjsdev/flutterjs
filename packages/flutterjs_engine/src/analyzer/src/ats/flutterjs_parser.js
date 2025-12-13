/**
 * FlutterJS Parser - Converts tokens to AST (FIXED VERSION)
 * Phase 1.2 MVP Implementation - Complete Fixes
 * 
 * Final fix: parseParameterList handles UNDEFINED and NULL token types
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

  parseTopLevel() {
    if (this.isAtEnd()) return null;

    if (this.isKeyword('import')) {
      this.advance();
      return this.parseImportDeclaration();
    }

    if (this.isKeyword('class')) {
      this.advance();
      return this.parseClassDeclaration();
    }

    if (this.isKeyword('function')) {
      this.advance();
      return this.parseFunctionDeclaration();
    }

    const expr = this.parseExpression();
    this.consumeStatementEnd();
    return new ExpressionStatement(expr, this.getLocation());
  }

  isKeyword(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.KEYWORD && token.value === value;
  }

  isPunctuation(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.PUNCTUATION && token.value === value;
  }

  isOperator(value) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === TokenType.OPERATOR && token.value === value;
  }

  parseImportDeclaration() {
    const startLocation = this.getLocation();
    const specifiers = [];

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

  parseClassDeclaration() {
    const startLocation = this.getLocation();
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected class name');
    const name = new Identifier(nameToken.value);

    let superClass = null;
    if (this.isKeyword('extends')) {
      this.advance();
      const superName = this.consume(TokenType.IDENTIFIER, 'Expected superclass name').value;
      superClass = new Identifier(superName);

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
      if (this.isKeyword('constructor')) {
        methods.push(this.parseMethodDeclaration());
      } else if (this.check(TokenType.IDENTIFIER)) {
        const idToken = this.peek();
        const nextToken = this.peekAhead(1);

        if (nextToken && nextToken.type === TokenType.PUNCTUATION && nextToken.value === '(') {
          methods.push(this.parseMethodDeclaration());
        } else {
          fields.push(this.parseFieldDeclaration());
        }
      } else {
        this.advance();
      }
    }

    this.consume(TokenType.PUNCTUATION, 'Expected }');
    const body = new ClassBody(fields, methods);
    return new ClassDeclaration(name, superClass, body, startLocation);
  }

  parseMethodDeclaration() {
    const startLocation = this.getLocation();
    
    let methodName;
    if (this.isKeyword('constructor')) {
      methodName = 'constructor';
      this.advance();
    } else {
      methodName = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;
    }
    
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
   * Parse parameter list - FIXED to handle UNDEFINED and NULL token types
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
            // FIXED: Check token type, not just keywords
            const token = this.peek();
            
            if (this.check(TokenType.IDENTIFIER)) {
              defaultValue = new Identifier(this.advance().value);
            } else if (this.check(TokenType.NUMBER)) {
              defaultValue = new Literal(parseFloat(this.advance().value), '', 'number');
            } else if (this.check(TokenType.UNDEFINED)) {
              // FIXED: Handle UNDEFINED token type
              this.advance();
              defaultValue = new Literal(undefined, 'undefined', 'undefined');
            } else if (this.check(TokenType.NULL)) {
              // FIXED: Handle NULL token type
              this.advance();
              defaultValue = new Literal(null, 'null', 'null');
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

        // Handle = {} after destructuring
        if (this.isOperator('=')) {
          this.advance();
          if (this.isPunctuation('{')) {
            this.advance();
            let braceDepth = 1;
            while (braceDepth > 0 && !this.isAtEnd()) {
              if (this.isPunctuation('{')) braceDepth++;
              else if (this.isPunctuation('}')) braceDepth--;
              if (braceDepth > 0) this.advance();
            }
            this.consume(TokenType.PUNCTUATION, 'Expected }');
          }
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Regular parameter
        const paramName = this.consume(TokenType.IDENTIFIER, 'Expected param name').value;
        let defaultValue = null;

        if (this.isOperator('=')) {
          this.advance();
          const token = this.peek();
          
          if (this.check(TokenType.IDENTIFIER)) {
            defaultValue = new Identifier(this.advance().value);
          } else if (this.check(TokenType.NUMBER)) {
            defaultValue = new Literal(parseFloat(this.advance().value), '', 'number');
          } else if (this.check(TokenType.UNDEFINED)) {
            this.advance();
            defaultValue = new Literal(undefined, 'undefined', 'undefined');
          } else if (this.check(TokenType.NULL)) {
            this.advance();
            defaultValue = new Literal(null, 'null', 'null');
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

  parseBlock() {
    const startLocation = this.getLocation();
    const statements = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      if (this.isKeyword('return')) {
        this.advance();
        let argument = null;
        if (!this.isPunctuation(';') && !this.isPunctuation('}')) {
          try {
            argument = this.parseExpression();
          } catch (error) {
            // If expression parsing fails, skip to semicolon
            while (!this.isPunctuation(';') && !this.isPunctuation('}') && !this.isAtEnd()) {
              this.advance();
            }
          }
        }
        this.consumeStatementEnd();
        statements.push(new ReturnStatement(argument, startLocation));
      } else {
        try {
          const expr = this.parseExpression();
          this.consumeStatementEnd();
          statements.push(new ExpressionStatement(expr, startLocation));
        } catch (error) {
          // Skip to next statement - find semicolon or closing brace
          while (!this.isPunctuation(';') && !this.isPunctuation('}') && !this.isAtEnd()) {
            this.advance();
          }
          if (this.isPunctuation(';')) {
            this.advance();
          }
        }
      }
    }

    if (this.isPunctuation('}')) {
      this.advance();
    }
    return new BlockStatement(statements, startLocation);
  }

  parseExpression() {
    return this.parseAssignment();
  }

  parseAssignment() {
    let expr = this.parseTernary();

    if (this.isOperator('=')) {
      this.advance();
      const value = this.parseAssignment();
      return { type: 'AssignmentExpression', left: expr, right: value };
    }

    return expr;
  }

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

  parseLogicalOr() {
    let expr = this.parseLogicalAnd();

    while (this.isOperator('||')) {
      this.advance();
      const right = this.parseLogicalAnd();
      expr = { type: 'LogicalExpression', operator: '||', left: expr, right };
    }

    return expr;
  }

  parseLogicalAnd() {
    let expr = this.parseEquality();

    while (this.isOperator('&&')) {
      this.advance();
      const right = this.parseEquality();
      expr = { type: 'LogicalExpression', operator: '&&', left: expr, right };
    }

    return expr;
  }

  parseEquality() {
    let expr = this.parseRelational();

    while (this.isOperator('===') || this.isOperator('!==') || this.isOperator('==') || this.isOperator('!=')) {
      const operator = this.advance().value;
      const right = this.parseRelational();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  parseRelational() {
    let expr = this.parseAdditive();

    while (this.isOperator('<') || this.isOperator('>') || this.isOperator('<=') || this.isOperator('>=')) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();

    while (this.isOperator('+') || this.isOperator('-')) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  parseMultiplicative() {
    let expr = this.parseUnary();

    while (this.isOperator('*') || this.isOperator('/') || this.isOperator('%')) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator, left: expr, right };
    }

    return expr;
  }

  parseUnary() {
    if (this.isOperator('!') || this.isOperator('-') || this.isOperator('+') || this.isOperator('~')) {
      const operator = this.advance().value;
      const expr = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument: expr };
    }

    if (this.isKeyword('this')) {
      this.advance();
      return new Identifier('this');
    }

    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parseCall();

    while (true) {
      if (this.isOperator('++') || this.isOperator('--')) {
        const operator = this.advance().value;
        expr = { type: 'UpdateExpression', operator, argument: expr, prefix: false };
      } else if (this.isPunctuation('.')) {
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

  parsePrimary() {
    // Handle 'this' keyword FIRST - before other checks
    if (this.isKeyword('this')) {
      this.advance();
      return new Identifier('this');
    }

    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      return new Literal(token.value, token.value, 'string');
    }

    if (this.check(TokenType.NUMBER)) {
      const token = this.advance();
      return new Literal(parseFloat(token.value), token.value, 'number');
    }

    if (this.check(TokenType.BOOLEAN)) {
      const token = this.advance();
      return new Literal(token.value === 'true', token.value, 'boolean');
    }

    if (this.check(TokenType.NULL)) {
      this.advance();
      return new Literal(null, 'null', 'null');
    }

    if (this.check(TokenType.UNDEFINED)) {
      this.advance();
      return new Literal(undefined, 'undefined', 'undefined');
    }

    if (this.isKeyword('null')) {
      this.advance();
      return new Literal(null, 'null', 'null');
    }

    if (this.isKeyword('undefined')) {
      this.advance();
      return new Literal(undefined, 'undefined', 'undefined');
    }

    if (this.isPunctuation('(')) {
      const savedPos = this.current;
      this.advance();

      // Check if empty params or identifier - might be arrow function
      if (this.isPunctuation(')')) {
        const nextPos = this.current + 1;
        // Check if next token is =>
        if (nextPos < this.tokens.length && 
            this.tokens[nextPos].type === TokenType.OPERATOR && 
            this.tokens[nextPos].value === '=>') {
          // It's an arrow function with no params: () => ...
          this.consume(TokenType.PUNCTUATION, 'Expected )');
          this.consume(TokenType.OPERATOR, 'Expected =>');
          const body = this.parseExpression();
          return new ArrowFunctionExpression([], body);
        }
      }

      // Otherwise parse as grouped expression
      const expr = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      
      // Check if it's actually an arrow function: (x) => expr
      if (this.isOperator('=>')) {
        this.advance();
        const body = this.parseExpression();
        // Convert expr back to parameter
        let params = [];
        if (expr.type === 'Identifier') {
          params = [new Parameter(expr, false, null)];
        }
        return new ArrowFunctionExpression(params, body);
      }
      
      return expr;
    }

    if (this.isPunctuation('{')) {
      this.advance();
      return this.parseObjectLiteral();
    }

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

    if (this.isKeyword('new')) {
      this.advance();
      const callee = new Identifier(this.consume(TokenType.IDENTIFIER, 'Expected class name').value);
      this.consume(TokenType.PUNCTUATION, 'Expected (');
      const args = this.parseArguments();
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      return new NewExpression(callee, args);
    }

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
      this.current = savedPos;
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const token = this.advance();
      const ident = new Identifier(token.value);

      if (this.isOperator('=>')) {
        this.advance();
        const body = this.parseExpression();
        return new ArrowFunctionExpression([new Parameter(ident)], body);
      }

      return ident;
    }

    throw this.error('Expected expression');
  }

  parseObjectLiteral() {
    const properties = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      let key = null;
      let shorthand = false;

      if (this.isPunctuation('[')) {
        this.advance();
        key = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, 'Expected ]');
      } else if (this.check(TokenType.IDENTIFIER)) {
        const token = this.advance();
        key = new Identifier(token.value);

        if (!this.isPunctuation(':')) {
          shorthand = true;
        }
      } else if (this.check(TokenType.STRING)) {
        const token = this.advance();
        key = new Literal(token.value, token.value, 'string');
      } else {
        this.advance();
        continue;
      }

      let value = key;
      if (!shorthand && this.isPunctuation(':')) {
        this.advance(); // consume :
        try {
          // Parse the full expression normally
          value = this.parseAssignment();
        } catch (error) {
          value = key;
        }
      }

      const prop = new Property(key, value);
      prop.shorthand = shorthand;
      properties.push(prop);

      if (this.isPunctuation(',')) {
        this.advance();
      } else if (!this.isPunctuation('}')) {
        // Skip until we find , or }
        while (!this.isPunctuation(',') && !this.isPunctuation('}') && !this.isAtEnd()) {
          this.advance();
        }
        if (this.isPunctuation(',')) {
          this.advance();
        }
      }
    }

    if (this.isPunctuation('}')) {
      this.advance();
    }
    return new ObjectLiteral(properties);
  }

  parseArguments() {
    const args = [];

    while (!this.isPunctuation(')') && !this.isAtEnd()) {
      try {
        args.push(this.parseExpression());
      } catch (error) {
        // Silently skip problematic arguments
        break;
      }
      if (!this.isPunctuation(',')) break;
      this.advance();
    }

    return args;
  }

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