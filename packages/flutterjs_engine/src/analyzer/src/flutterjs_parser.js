/**
 * FlutterJS Parser - Converts tokens to AST (FIXED VERSION)
 * Phase 1.2 MVP Implementation - Complete Fixes
 * 
 * Final fix: parseParameterList handles UNDEFINED and NULL token types
 */


import { TokenType } from './lexer.js';
import { getLogger } from './flutterjs_logger.js';

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
    // NEW: Call stack tracking
    this.callStack = [];

    this.debugMode = true;
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
    const logger = getLogger().createComponentLogger('Parser.parseClassDeclaration');
    logger.startSession('parseClassDeclaration');
    logger.trace(`  Current token: ${this.peek().value} (${this.peek().type})`);

    const startLocation = this.getLocation();
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected class name');
    const name = new Identifier(nameToken.value);
    logger.trace(`  Class name: ${name.name}`);

    let superClass = null;
    if (this.isKeyword('extends')) {
      this.advance();
      const superName = this.consume(TokenType.IDENTIFIER, 'Expected superclass name').value;
      superClass = new Identifier(superName);
      logger.trace(`  Extends: ${superClass.name}`);

      // Skip generic type parameters like <MyCounter>
      if (this.isOperator('<')) {
        this.advance();
        this.consume(TokenType.IDENTIFIER, 'Expected type name');
        this.consume(TokenType.OPERATOR, 'Expected >');
      }
    }

    logger.trace(`  Looking for opening brace...`);
    logger.trace(`  Current token: ${this.peek().value} (${this.peek().type})`);
    this.consume(TokenType.PUNCTUATION, 'Expected {');

    const fields = [];
    const methods = [];

    logger.trace(`  Parsing class body...`);
    let itemCount = 0;

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      logger.trace(`    [item ${itemCount}] Current token: ${this.peek().value} (${this.peek().type})`);

      // Skip semicolons
      if (this.isPunctuation(';')) {
        logger.trace(`    Skipping semicolon`);
        this.advance();
        continue;
      }

      // Check for constructor (always a method)
      if (this.isKeyword('constructor')) {
        logger.trace(`    Found constructor`);
        methods.push(this.parseMethodDeclaration());
        itemCount++;
        continue;
      }

      // Check for field or method
      if (this.check(TokenType.IDENTIFIER)) {
        const currentPos = this.current;
        const idToken = this.peek();
        const fieldName = idToken.value;
        logger.trace(`    Found identifier: ${fieldName}`);
        this.advance();

        // CASE 1: Field initializer - IDENTIFIER = value
        if (this.isOperator('=')) {
          logger.trace(`      -> This is a FIELD (followed by =)`);
          this.current = currentPos; // Rewind
          try {
            fields.push(this.parseFieldDeclaration());
            logger.trace(`      Field parsed successfully`);
            itemCount++;
            continue;
          } catch (e) {
            console.error(`      ERROR parsing field: ${e.message}`);
            throw e;
          }
        }

        // CASE 2: Method - IDENTIFIER ( params )
        if (this.isPunctuation('(')) {
          logger.trace(`      -> This is a METHOD (followed by '(')`);
          this.current = currentPos; // Rewind
          try {
            methods.push(this.parseMethodDeclaration());
            logger.trace(`      Method parsed successfully`);
            itemCount++;
            continue;
          } catch (e) {
            console.error(`      ERROR parsing method: ${e.message}`);
            throw e;
          }
        }

        logger.trace(`      -> Unknown pattern, skipping`);
        this.advance();
        continue;
      }

      // Skip unknown tokens
      logger.trace(`    Skipping unknown token: ${this.peek().value}`);
      this.advance();
    }

    logger.trace(`  Class body parsing complete. Found ${fields.length} fields, ${methods.length} methods`);

    this.consume(TokenType.PUNCTUATION, 'Expected }');
    const body = new ClassBody(fields, methods);
    logger.trace(`[parseClassDeclaration] SUCCESS\n`);
    return new ClassDeclaration(name, superClass, body, startLocation);
  }

  parseMethodDeclaration() {
    const logger = getLogger().createComponentLogger('Parser.parseMethodDeclaration');
    logger.startSession(`      [parseMethodDeclaration] STARTING`);
    logger.trace(`        Current: ${this.peek().value}`);

    const startLocation = this.getLocation();

    let methodName;
    if (this.isKeyword('constructor')) {
      methodName = 'constructor';
      this.advance();
    } else {
      methodName = this.consume(TokenType.IDENTIFIER, 'Expected method name').value;
    }

    logger.trace(`        Method name: ${methodName}`);
    const key = new Identifier(methodName);

    this.consume(TokenType.PUNCTUATION, 'Expected (');
    const params = this.parseParameterList();
    logger.trace(`        Parameters: ${params.length}`);
    this.consume(TokenType.PUNCTUATION, 'Expected )');

    let body = null;
    if (this.isOperator('=>')) {
      logger.trace(`        Arrow function body`);
      this.advance();
      body = this.parseExpression();
    } else if (this.isPunctuation('{')) {
      logger.trace(`        Block body`);
      this.advance();
      body = this.parseBlock();
    }

    logger.trace(`      [parseMethodDeclaration] SUCCESS`);
    return new MethodDeclaration(key, params, body, startLocation);
  }
  parseFieldDeclaration() {
    console.log(`      [parseFieldDeclaration] STARTING`);
    console.log(`        Current: ${this.peek().value}`);

    const startLocation = this.getLocation();
    const fieldName = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
    const key = new Identifier(fieldName);
    console.log(`        Field name: ${fieldName}`);

    let initialValue = null;
    if (this.isOperator('=')) {
      console.log(`        Found = operator, parsing initializer...`);
      this.advance();
      try {
        initialValue = this.parseExpression();
        console.log(`        Initializer parsed: ${initialValue.type}`);
      } catch (e) {
        console.error(`        ERROR parsing initializer: ${e.message}`);
        throw e;
      }
    }

    this.consumeStatementEnd();
    console.log(`      [parseFieldDeclaration] SUCCESS`);
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
    console.log(`\n[parseBlock] STARTING at token: ${this.peek().value}`);

    const startLocation = this.getLocation();
    const statements = [];

    while (!this.isPunctuation('}') && !this.isAtEnd()) {
      console.log(`  [parseBlock] Current token: ${this.peek().value} (${this.peek().type})`);

      if (this.isKeyword('return')) {
        console.log(`    Found RETURN statement`);
        this.advance();
        let argument = null;

        if (!this.isPunctuation(';') && !this.isPunctuation('}')) {
          console.log(`    Parsing return argument...`);
          try {
            argument = this.parseExpression();
            console.log(`    Return argument parsed successfully`);
          } catch (error) {
            console.error(`    ❌ ERROR parsing return argument: ${error.message}`);
            console.error(`       Token was: ${this.peek().value}`);

            // Skip to semicolon
            while (!this.isPunctuation(';') && !this.isPunctuation('}') && !this.isAtEnd()) {
              this.advance();
            }
          }
        }

        this.consumeStatementEnd();
        statements.push(new ReturnStatement(argument, startLocation));

      } else {
        console.log(`    Parsing expression statement...`);
        try {
          const expr = this.parseExpression();
          console.log(`    Expression parsed successfully: ${expr.type}`);
          this.consumeStatementEnd();
          statements.push(new ExpressionStatement(expr, startLocation));
        } catch (error) {
          console.error(`    ❌ ERROR parsing expression: ${error.message}`);
          console.error(`       Token was: ${this.peek().value}`);

          // Skip to next statement
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

    console.log(`[parseBlock] SUCCESS - ${statements.length} statements\n`);
    return new BlockStatement(statements, startLocation);
  }

  parseExpression() {
    console.log(`    [parseExpression] Current token: ${this.peek().value}`);
    try {
      const result = this.parseAssignment();
      console.log(`    [parseExpression] ✓ Success, type: ${result.type}`);
      return result;
    } catch (e) {
      console.error(`    [parseExpression] ✗ Failed: ${e.message}`);
      throw e;
    }
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
    console.log(`        [parseUnary] Current: ${this.peek().value}`);

    if (this.isOperator('!') || this.isOperator('-') || this.isOperator('+') || this.isOperator('~')) {
      const operator = this.advance().value;
      const expr = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument: expr };
    }


    console.log(`        [parseUnary] Calling parsePostfix`);
    return this.parsePostfix();
  }

  parsePostfix() {
    console.log(`        [parsePostfix] Starting, calling parseCall`);
    let expr = this.parseCall();
    console.log(`        [parsePostfix] parseCall returned: ${expr.type || expr.name}`);
    console.log(`        [parsePostfix] Next token: ${this.peek().value}`);

    while (true) {
      if (this.isOperator('++') || this.isOperator('--')) {
        const operator = this.advance().value;
        expr = { type: 'UpdateExpression', operator, argument: expr, prefix: false };
      } else if (this.isPunctuation('.')) {
        console.log(`        [parsePostfix] Found . member access`);
        this.advance();
        const property = new Identifier(this.consume(TokenType.IDENTIFIER, 'Expected property').value);
        expr = new MemberExpression(expr, property, false);
        console.log(`        [parsePostfix] Created MemberExpression: ${expr.object.name}.${expr.property.name}`);
      } else if (this.isPunctuation('[')) {
        console.log(`        [parsePostfix] Found [ computed access`);
        this.advance();
        const property = this.parseExpression();
        this.consume(TokenType.PUNCTUATION, 'Expected ]');
        expr = new MemberExpression(expr, property, true);
      } else {
        console.log(`        [parsePostfix] No more postfix ops, returning ${expr.type}`);
        break;
      }
    }

    return expr;
  }


  parseCall() {
    console.log(`        [parseCall] Starting, calling parsePrimary`);
    let expr = this.parsePrimary();
    console.log(`        [parseCall] parsePrimary returned: ${expr.type || expr.name}`);
    console.log(`        [parseCall] Next token: ${this.peek().value} (${this.peek().type})`);

    while (this.isPunctuation('(')) {
      console.log(`        [parseCall] Found (, parsing function call`);
      this.advance();
      const args = this.parseArguments();
      console.log(`        [parseCall] Parsed ${args.length} arguments`);
      this.consume(TokenType.PUNCTUATION, 'Expected )');
      expr = new CallExpression(expr, args);
      console.log(`        [parseCall] Created CallExpression`);
    }

    console.log(`        [parseCall] Returning: ${expr.type}`);
    return expr;
  }

  parsePrimary() {
    console.log(`      [parsePrimary] Current: ${this.peek().value} (${this.peek().type})`);

    // Handle 'this' keyword FIRST
    if (this.isKeyword('this')) {
      this.advance();
      console.log(`      [parsePrimary] ✓ this keyword`);
      return new Identifier('this');
    }

    if (this.check(TokenType.STRING)) {
      const token = this.advance();
      console.log(`      [parsePrimary] ✓ string literal: ${token.value}`);
      return new Literal(token.value, token.value, 'string');
    }

    if (this.check(TokenType.NUMBER)) {
      const token = this.advance();
      console.log(`      [parsePrimary] ✓ number literal: ${token.value}`);
      return new Literal(parseFloat(token.value), token.value, 'number');
    }

    if (this.check(TokenType.BOOLEAN)) {
      const token = this.advance();
      console.log(`      [parsePrimary] ✓ boolean: ${token.value}`);
      return new Literal(token.value === 'true', token.value, 'boolean');
    }

    if (this.check(TokenType.NULL)) {
      this.advance();
      console.log(`      [parsePrimary] ✓ null`);
      return new Literal(null, 'null', 'null');
    }

    if (this.check(TokenType.UNDEFINED)) {
      this.advance();
      console.log(`      [parsePrimary] ✓ undefined`);
      return new Literal(undefined, 'undefined', 'undefined');
    }

    if (this.isKeyword('null')) {
      this.advance();
      console.log(`      [parsePrimary] ✓ null keyword`);
      return new Literal(null, 'null', 'null');
    }

    if (this.isKeyword('undefined')) {
      this.advance();
      console.log(`      [parsePrimary] ✓ undefined keyword`);
      return new Literal(undefined, 'undefined', 'undefined');
    }

    if (this.isPunctuation('(')) {
      console.log(`      [parsePrimary] Found ( - checking for arrow function or grouped expr`);
      const savedPos = this.current;
      this.advance();

      if (this.isPunctuation(')')) {
        const nextPos = this.current + 1;
        if (nextPos < this.tokens.length &&
          this.tokens[nextPos].type === TokenType.OPERATOR &&
          this.tokens[nextPos].value === '=>') {
          console.log(`      [parsePrimary] ✓ arrow function with no params: () => ...`);
          this.consume(TokenType.PUNCTUATION, 'Expected )');
          this.consume(TokenType.OPERATOR, 'Expected =>');
          const body = this.parseExpression();
          return new ArrowFunctionExpression([], body);
        }
      }

      const expr = this.parseExpression();
      this.consume(TokenType.PUNCTUATION, 'Expected )');

      if (this.isOperator('=>')) {
        console.log(`      [parsePrimary] ✓ arrow function: (x) => ...`);
        this.advance();
        const body = this.parseExpression();
        let params = [];
        if (expr.type === 'Identifier') {
          params = [new Parameter(expr, false, null)];
        }
        return new ArrowFunctionExpression(params, body);
      }

      console.log(`      [parsePrimary] ✓ grouped expression`);
      return expr;
    }

    if (this.isPunctuation('{')) {
      console.log(`      [parsePrimary] ✓ object literal`);
      this.advance();
      return this.parseObjectLiteral();
    }

    if (this.isPunctuation('[')) {
      console.log(`      [parsePrimary] ✓ array literal`);
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
      console.log(`      [parsePrimary] ✓ new expression`);
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
        console.log(`      [parsePrimary] ✓ const new expression`);
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
      console.log(`      [parsePrimary] ✓ identifier: ${token.value}`);

      if (this.isOperator('=>')) {
        console.log(`      [parsePrimary] ✓ arrow function: x => ...`);
        this.advance();
        const body = this.parseExpression();
        return new ArrowFunctionExpression([new Parameter(ident)], body);
      }

      return ident;
    }

    // If we get here, we couldn't parse anything
    console.error(`      [parsePrimary] ❌ FAILED - Cannot parse token: ${this.peek().value} (${this.peek().type})`);
    throw this.error('Expected expression');
  }


  enterMethod(methodName) {
    if (!this.callStack) this.callStack = [];
    this.callStack.push({
      method: methodName,
      line: this.peek().line,
      column: this.peek().column,
      token: this.peek().value,
    });
  }

  parseObjectLiteral() {
    this.enterMethod('parseObjectLiteral');
    const properties = [];

    try {
      while (!this.isPunctuation('}') && !this.isAtEnd()) {
        if (this.isPunctuation(',')) {
          this.advance();
          continue;
        }

        let key = null;
        let shorthand = false;

        if (this.isPunctuation('[')) {
          this.advance();
          key = this.parseExpression();
          this.consume(TokenType.PUNCTUATION, 'Expected ]');
        } else if (this.check(TokenType.IDENTIFIER)) {
          const token = this.advance();
          key = new Identifier(token.value);

          if (this.isPunctuation(',') || this.isPunctuation('}')) {
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
          this.advance();

          try {
            value = this.parseTernary();
          } catch (error) {
            if (error.parserError) {
              this.reportParserError(error.parserError);
            }
            value = key;

            while (!this.isPunctuation(',') && !this.isPunctuation('}') && !this.isAtEnd()) {
              this.advance();
            }
          }
        }

        const prop = new Property(key, value);
        prop.shorthand = shorthand;
        properties.push(prop);

        if (this.isPunctuation(',')) {
          this.advance();
        }
      }

      if (this.isPunctuation('}')) {
        this.advance();
      }

      this.exitMethod('parseObjectLiteral');
      return new ObjectLiteral(properties);
    } catch (e) {
      this.exitMethod('parseObjectLiteral');
      throw e;
    }
  }
  parseArguments() {
    const args = [];

    while (!this.isPunctuation(')') && !this.isAtEnd()) {
      try {
        // ⭐ KEY FIX: Use parseTernary() instead of parseLogicalOr()
        // This allows all operators except assignment
        args.push(this.parseTernary());
      } catch (error) {
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
  /**
  * Enhanced error reporting with full call stack
  */
  error(message) {
    const token = this.peek();
    const errorObj = new Error(
      `Parse error at line ${token.line}, column ${token.column}: ${message}`
    );
    errorObj.parserError = {
      message: `Parse error at line ${token.line}, column ${token.column}: ${message}`,
      line: token.line,
      column: token.column,
      token: { type: token.type, value: token.value },
      callStack: this.callStack ? [...this.callStack] : [],
    };
    return errorObj;
  }
  /**
   * Get context around current token (5 tokens before and after)
   */
  getContext() {
    const start = Math.max(0, this.current - 5);
    const end = Math.min(this.tokens.length, this.current + 6);

    return {
      before: this.tokens.slice(start, this.current).map(t => `${t.value}(${t.type})`).join(' '),
      current: `→ ${this.peek().value}(${this.peek().type}) ←`,
      after: this.tokens.slice(this.current + 1, end).map(t => `${t.value}(${t.type})`).join(' '),
    };
  }
  /**
   * Track when exiting a parser method
   */
  exitMethod(methodName) {
    if (!this.callStack) this.callStack = [];
    if (this.callStack.length > 0) {
      const last = this.callStack[this.callStack.length - 1];
      if (last.method === methodName) {
        this.callStack.pop();
      }
    }
  }

  getTokenContext() {
    const start = Math.max(0, this.current - 5);
    const end = Math.min(this.tokens.length, this.current + 6);

    const before = this.tokens
      .slice(start, this.current)
      .map(t => `${t.value}`)
      .join(' ');

    const after = this.tokens
      .slice(this.current + 1, end)
      .map(t => `${t.value}`)
      .join(' ');

    return {
      before: before,
      current: `→ ${this.peek().value} ←`,
      after: after,
    };
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

  /**
   * Report error with full context
   */
  reportError(error) {
    this.errors.push(error);

    if (this.debugMode) {
      console.error('\n❌ PARSER ERROR DETECTED:\n');
      console.error(`Message: ${error.message}\n`);

      console.error('📍 Token Context:');
      console.error(`  Before:  ${error.context.before}`);
      console.error(`  Current: ${error.context.current}`);
      console.error(`  After:   ${error.context.after}\n`);

      console.error('📚 Call Stack (where error came from):');
      if (error.callStack.length === 0) {
        console.error('  (top level)\n');
      } else {
        error.callStack.forEach((frame, idx) => {
          const arrow = idx === error.callStack.length - 1 ? '→' : ' ';
          console.error(`  ${arrow} ${idx + 1}. ${frame.method}()`);
          console.error(`     at token: "${frame.token}" (line ${frame.line}, col ${frame.column})`);
        });
        console.error('');
      }
    }
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