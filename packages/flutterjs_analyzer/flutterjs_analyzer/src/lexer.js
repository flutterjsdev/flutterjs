// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS Lexer - Converts source code to tokens
 * Phase 1.1 MVP Implementation
 * 
 * No external dependencies - pure Node.js
 */

// ============================================================================
// TOKEN CLASS
// ============================================================================

/**
 * Represents a single token in the source code
 */
class Token {
  constructor(type, value, line, column) {
    this.type = type;           // Token type (KEYWORD, IDENTIFIER, etc.)
    this.value = value;         // Token value (the actual string)
    this.line = line;           // Line number (1-indexed)
    this.column = column;       // Column number (0-indexed)
  }

  /**
   * Get human-readable token representation
   */
  toString() {
    return `Token(${this.type}, "${this.value}", ${this.line}:${this.column})`;
  }

  /**
   * Check if this token matches a type or list of types
   */
  isType(types) {
    if (Array.isArray(types)) {
      return types.includes(this.type);
    }
    return this.type === types;
  }
}

// ============================================================================
// TOKEN TYPE CONSTANTS
// ============================================================================

const TokenType = {
  // Literals
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  UNDEFINED: 'UNDEFINED',

  // Keywords
  KEYWORD: 'KEYWORD',

  // Identifiers
  IDENTIFIER: 'IDENTIFIER',

  // Operators & Punctuation
  OPERATOR: 'OPERATOR',
  PUNCTUATION: 'PUNCTUATION',

  // Comments & Whitespace
  COMMENT: 'COMMENT',
  WHITESPACE: 'WHITESPACE',
  NEWLINE: 'NEWLINE',

  // Special
  EOF: 'EOF',
};

// ============================================================================
// LEXER CLASS
// ============================================================================

/**
 * Lexer - Converts source code string into a stream of tokens
 */
class Lexer {
  constructor(source, options = {}) {
    this.source = source;
    this.position = 0;           // Current position in source
    this.line = 1;               // Current line number
    this.column = 0;             // Current column number
    this.tokens = [];            // Collected tokens
    this.errors = [];            // Lexing errors

    // Configuration
    this.options = {
      includeWhitespace: false,   // Include whitespace tokens in output
      includeComments: true,      // Include comment tokens
      ...options,
    };

    // Keywords that we care about for FlutterJS
    this.keywords = new Set([
      'class', 'extends', 'constructor', 'new', 'const',
      'function', 'return', 'if', 'else', 'for', 'while',
      'this', 'static', 'async', 'await', 'import', 'export',
      'from', 'as', 'default', 'true', 'false', 'null',
      'undefined', 'typeof', 'instanceof', 'void', 'delete',
    ]);
  }

  /**
   * Main entry point - tokenize entire source
   */
  tokenize() {
    while (this.position < this.source.length) {
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.line, this.column));
    return this.tokens;
  }

  /**
   * Scan a single token
   */
  scanToken() {
    const ch = this.peek();

    // Handle whitespace
    if (this.isWhitespace(ch)) {
      return this.scanWhitespace();
    }

    // Handle comments
    if (ch === '/' && (this.peekNext() === '/' || this.peekNext() === '*')) {
      return this.scanComment();
    }

    // Handle strings
    if (ch === '"' || ch === "'" || ch === '`') {
      return this.scanString();
    }

    // Handle numbers
    if (this.isDigit(ch)) {
      return this.scanNumber();
    }

    // Handle identifiers and keywords
    if (this.isIdentifierStart(ch)) {
      return this.scanIdentifier();
    }

    // Handle operators and punctuation
    return this.scanOperatorOrPunctuation();
  }

  /**
   * Scan whitespace and newlines
   */
  scanWhitespace() {
    const startColumn = this.column;
    let whitespaceStr = '';

    while (this.position < this.source.length && this.isWhitespace(this.peek())) {
      const ch = this.advance();
      whitespaceStr += ch;

      if (ch === '\n') {
        if (this.options.includeWhitespace) {
          this.tokens.push(new Token(TokenType.NEWLINE, '\n', this.line - 1, startColumn));
        }
        this.line++;
        this.column = 0;
        whitespaceStr = '';
      }
    }

    // Add remaining whitespace if configured
    if (this.options.includeWhitespace && whitespaceStr.length > 0) {
      this.tokens.push(new Token(TokenType.WHITESPACE, whitespaceStr, this.line, startColumn));
    }
  }

  /**
   * Scan comments (single-line // and multi-line )
   */
  scanComment() {
    const startLine = this.line;
    const startColumn = this.column;
    let content = '';

    if (this.peekNext() === '/') {
      // Single-line comment
      this.advance(); // /
      this.advance(); // /

      while (this.position < this.source.length && this.peek() !== '\n') {
        content += this.advance();
      }

      if (this.options.includeComments) {
        this.tokens.push(new Token(TokenType.COMMENT, content, startLine, startColumn));
      }
    } else if (this.peekNext() === '*') {
      // Multi-line comment
      this.advance(); // /
      this.advance(); // *

      while (this.position < this.source.length) {
        if (this.peek() === '*' && this.peekNext() === '/') {
          this.advance(); // *
          this.advance(); // /
          break;
        }

        const ch = this.advance();
        content += ch;

        if (ch === '\n') {
          this.line++;
          this.column = 0;
        }
      }

      if (this.options.includeComments) {
        this.tokens.push(new Token(TokenType.COMMENT, content, startLine, startColumn));
      }
    }
  }

  /**
   * Scan string literals (", ', `)
   */
  scanString() {
    const startLine = this.line;
    const startColumn = this.column;
    const quoteChar = this.advance();
    let value = '';

    while (this.position < this.source.length) {
      const ch = this.peek();

      if (ch === quoteChar) {
        this.advance();
        break;
      }

      if (ch === '\\') {
        // Handle escape sequences
        this.advance();
        const escaped = this.advance();
        value += this.getEscapeSequence(escaped);
      } else {
        if (ch === '\n') {
          this.line++;
          this.column = 0;
        }
        value += this.advance();
      }
    }

    this.tokens.push(new Token(TokenType.STRING, value, startLine, startColumn));
  }

  /**
   * Scan number literals (integers and floats)
   */
  scanNumber() {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Scan integer part
    while (this.position < this.source.length && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Scan decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (this.position < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Scan exponent part (e.g., 1e10, 1E-5)
    if ((this.peek() === 'e' || this.peek() === 'E') && this.isDigit(this.peekNext())) {
      value += this.advance(); // e/E
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      while (this.position < this.source.length && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.tokens.push(new Token(TokenType.NUMBER, value, startLine, startColumn));
  }

  /**
   * Scan identifiers and keywords
   */
  scanIdentifier() {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    while (
      this.position < this.source.length &&
      this.isIdentifierPart(this.peek())
    ) {
      value += this.advance();
    }

    // Check if it's a keyword or special literal
    let tokenType = TokenType.IDENTIFIER;
    if (this.keywords.has(value)) {
      if (value === 'true' || value === 'false') {
        tokenType = TokenType.BOOLEAN;
      } else if (value === 'null') {
        tokenType = TokenType.NULL;
      } else if (value === 'undefined') {
        tokenType = TokenType.UNDEFINED;
      } else {
        tokenType = TokenType.KEYWORD;
      }
    }

    this.tokens.push(new Token(tokenType, value, startLine, startColumn));
  }

  /**
   * Scan operators and punctuation
   */
  scanOperatorOrPunctuation() {
    const startLine = this.line;
    const startColumn = this.column;
    const ch = this.advance();

    // Two-character operators
    const twoChar = ch + (this.peek() || '');
    const twoCharOps = [
      '=>', '==', '!=', '===', '!==', '<=', '>=',
      '++', '--', '&&', '||', '+=', '-=', '*=', '/=', '%=',
      '??', '?.', '..', '**',
    ];

    if (twoCharOps.includes(twoChar)) {
      this.advance();
      this.tokens.push(new Token(TokenType.OPERATOR, twoChar, startLine, startColumn));
      return;
    }

    // Three-character operators
    const threeChar = twoChar + (this.peek() || '');
    const threeCharOps = ['===', '!==', '...'];
    if (threeCharOps.includes(threeChar)) {
      this.advance();
      this.tokens.push(new Token(TokenType.OPERATOR, threeChar, startLine, startColumn));
      return;
    }

    // Single-character operators
    const singleCharOps = [
      '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
    ];
    if (singleCharOps.includes(ch)) {
      this.tokens.push(new Token(TokenType.OPERATOR, ch, startLine, startColumn));
      return;
    }

    // Punctuation
    const punctuation = [
      '{', '}', '(', ')', '[', ']', ';', ',', '.', '@', '#',
    ];
    if (punctuation.includes(ch)) {
      this.tokens.push(new Token(TokenType.PUNCTUATION, ch, startLine, startColumn));
      return;
    }

    // Unknown character - log error but continue
    this.errors.push({
      message: `Unexpected character: '${ch}'`,
      line: startLine,
      column: startColumn,
    });
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Peek at current character without consuming it
   */
  peek(offset = 0) {
    const pos = this.position + offset;
    if (pos >= this.source.length) return null;
    return this.source[pos];
  }

  /**
   * Peek at next character
   */
  peekNext() {
    return this.peek(1);
  }

  /**
   * Consume and return current character
   */
  advance() {
    const ch = this.source[this.position];
    this.position++;
    this.column++;
    return ch;
  }

  /**
   * Check if character is whitespace (excluding newlines)
   */
  isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
  }

  /**
   * Check if character is a digit
   */
  isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  /**
   * Check if character can start an identifier
   */
  isIdentifierStart(ch) {
    if (!ch) return false;
    return (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_' ||
           ch === '$';
  }

  /**
   * Check if character can be part of an identifier
   */
  isIdentifierPart(ch) {
    if (!ch) return false;
    return this.isIdentifierStart(ch) || this.isDigit(ch);
  }

  /**
   * Get escape sequence value
   */
  getEscapeSequence(ch) {
    const escapes = {
      'n': '\n',
      't': '\t',
      'r': '\r',
      '\\': '\\',
      '"': '"',
      "'": "'",
      '`': '`',
      '0': '\0',
    };
    return escapes[ch] || ch;
  }

  /**
   * Get all tokens (convenience method)
   */
  getTokens() {
    return this.tokens;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Pretty-print tokens for debugging
   */
  printTokens() {
    console.log('\n=== TOKENS ===\n');
    this.tokens.forEach((token, index) => {
      console.log(`[${index}] ${token.toString()}`);
    });
    console.log(`\nTotal: ${this.tokens.length} tokens\n`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Token,
  Lexer,
  TokenType,
};