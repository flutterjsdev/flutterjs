// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * dart:core - Error classes
 * JavaScript implementations of Dart's core error types
 */

/**
 * Base Exception class - represents expected error conditions
 */
export class Exception extends Error {
  constructor(message) {
    super(message);
    this.name = 'Exception';
    this.message = message;
  }

  toString() {
    if (this.message == null) return 'Exception';
    return `Exception: ${this.message}`;
  }
}

/**
 * Base Error class - represents program failures that should have been avoided
 */
export class DartError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Error';
  }

  /**
   * Safely convert a value to a string description
   */
  static safeToString(object) {
    if (object === null || object === undefined) {
      return String(object);
    }
    if (typeof object === 'number' || typeof object === 'boolean') {
      return object.toString();
    }
    if (typeof object === 'string') {
      return object;
    }
    try {
      return String(object);
    } catch (e) {
      return '[object]';
    }
  }
}

/**
 * Error thrown when an assert statement fails
 */
export class AssertionError extends DartError {
  constructor(message) {
    super(message || 'Assertion failed');
    this.name = 'AssertionError';
    this.message = message;
  }

  toString() {
    if (this.message != null) {
      return `Assertion failed: ${DartError.safeToString(this.message)}`;
    }
    return 'Assertion failed';
  }
}

/**
 * Error thrown when a dynamic type error happens
 */
export class TypeError extends DartError {
  constructor(message) {
    super(message || 'Type error');
    this.name = 'TypeError';
  }
}

/**
 * Error thrown when a function is passed an unacceptable argument
 */
export class ArgumentError extends DartError {
  constructor(message, name) {
    super(message);
    this.name = 'ArgumentError';
    this.message = message;
    this.argumentName = name;
    this.invalidValue = null;
    this._hasValue = false;
  }

  /**
   * Creates error containing the invalid value
   */
  static value(value, name, message) {
    const error = new ArgumentError(message, name);
    error.invalidValue = value;
    error._hasValue = true;
    return error;
  }

  /**
   * Creates an argument error for a null argument that must not be null
   */
  static notNull(name) {
    const error = new ArgumentError('Must not be null', name);
    error.invalidValue = null;
    error._hasValue = false;
    return error;
  }

  /**
   * Throws if argument is null
   */
  static checkNotNull(argument, name) {
    if (argument == null) {
      throw ArgumentError.notNull(name);
    }
    return argument;
  }

  toString() {
    const nameString = this.argumentName ? ` (${this.argumentName})` : '';
    const messageString = this.message ? `: ${this.message}` : '';
    const prefix = `Invalid argument${!this._hasValue ? '(s)' : ''}${nameString}${messageString}`;

    if (!this._hasValue) return prefix;

    const errorValue = DartError.safeToString(this.invalidValue);
    return `${prefix}: ${errorValue}`;
  }
}

/**
 * Error thrown when a value is outside an accepted range
 */
export class RangeError extends ArgumentError {
  constructor(message) {
    super(message);
    this.name = 'RangeError';
    this.start = null;
    this.end = null;
  }

  /**
   * Creates a range error for a value not in the range start..end
   */
  static range(value, start, end, name, message) {
    const error = ArgumentError.value(value, name, message || 'Invalid value');
    error.name = 'RangeError';
    error.start = start;
    error.end = end;
    return error;
  }

  /**
   * Creates a range error for an invalid index
   */
  static index(invalidValue, indexable, name, message, length) {
    const actualLength = length ?? indexable?.length ?? 0;
    const error = RangeError.range(
      invalidValue,
      0,
      actualLength - 1,
      name || 'index',
      message || 'Index out of range'
    );
    return error;
  }

  toString() {
    const value = this.invalidValue;
    if (this.start == null) {
      return super.toString();
    }

    let explanation = '';
    if (value == null) {
      explanation = 'must not be null';
    } else if (value < this.start) {
      explanation = `must not be less than ${this.start}`;
    } else if (value > this.end) {
      explanation = `must not be greater than ${this.end}`;
    } else {
      return super.toString();
    }

    const nameString = this.argumentName ? ` (${this.argumentName})` : '';
    const valueString = DartError.safeToString(value);
    return `RangeError${nameString}: ${explanation}: ${valueString}`;
  }
}

/**
 * Error thrown when an index is not valid for an indexable object
 */
export class IndexError extends RangeError {
  constructor(invalidValue, indexable, name, message, length) {
    super(message);
    this.name = 'IndexError';
    this.invalidValue = invalidValue;
    this._hasValue = true;
    this.indexable = indexable;
    this.argumentName = name || 'index';
    const actualLength = length ?? indexable?.length ?? 0;
    this.start = 0;
    this.end = Math.max(0, actualLength - 1);
  }

  static withLength(invalidValue, length, name, message) {
    return new IndexError(invalidValue, null, name, message, length);
  }

  toString() {
    const nameString = this.argumentName ? ` ${this.argumentName}` : '';
    const valueString = DartError.safeToString(this.invalidValue);
    return `Index out of range:${nameString} ${valueString} should be in the range [${this.start}..${this.end}]`;
  }
}

/**
 * Error thrown when calling a method that doesn't exist
 */
export class NoSuchMethodError extends DartError {
  constructor(receiver, memberName, positionalArguments, namedArguments) {
    super(`No such method: '${memberName}'`);
    this.name = 'NoSuchMethodError';
    this.receiver = receiver;
    this.memberName = memberName;
    this.positionalArguments = positionalArguments || [];
    this.namedArguments = namedArguments || {};
  }

  toString() {
    return `NoSuchMethodError: method not found: '${this.memberName}'`;
  }
}

/**
 * Error thrown when an operation is not supported
 */
export class UnsupportedError extends DartError {
  constructor(message) {
    super(message || 'Unsupported operation');
    this.name = 'UnsupportedError';
  }
}

/**
 * Error thrown when an operation is not implemented
 */
export class UnimplementedError extends UnsupportedError {
  constructor(message) {
    super(message || 'UnimplementedError');
    this.name = 'UnimplementedError';
  }
}

/**
 * Error thrown when an operation is not allowed in the current state
 */
export class StateError extends DartError {
  constructor(message) {
    super(message || 'Bad state');
    this.name = 'StateError';
  }
}

/**
 * Error thrown when a collection is modified during iteration
 */
export class ConcurrentModificationError extends DartError {
  constructor(modifiedObject) {
    super('Concurrent modification during iteration');
    this.name = 'ConcurrentModificationError';
    this.modifiedObject = modifiedObject;
  }

  toString() {
    if (this.modifiedObject == null) {
      return 'Concurrent modification during iteration';
    }
    return `Concurrent modification during iteration: ${DartError.safeToString(this.modifiedObject)}`;
  }
}

/**
 * Error thrown on a failed runtime type check
 */
export class CastError extends DartError {
  constructor(message) {
    super(message || 'Cast error');
    this.name = 'CastError';
  }
}

/**
 * Error thrown when a scheduled timeout happens
 */
export class TimeoutException extends DartError {
  constructor(message, duration) {
    super(message || 'Operation timed out');
    this.name = 'TimeoutException';
    this.duration = duration;
  }
}

/**
 * Error thrown when a string or other data has an invalid format
 */
export class FormatException extends DartError {
  constructor(message, source, offset) {
    super(message || 'Invalid format');
    this.name = 'FormatException';
    this.source = source;
    this.offset = offset ?? 0;
  }

  toString() {
    let result = 'FormatException';
    if (this.message) {
      result += `: ${this.message}`;
    }
    if (this.source != null) {
      if (this.offset != null && this.offset >= 0) {
        result += ` (at offset ${this.offset})`;
      }
    }
    return result;
  }
}

/**
 * Checks whether two references are to the same object.
 * In JavaScript, this is equivalent to ===
 */
export function identical(a, b) {
  return a === b;
}

// Export Error as DartError to avoid conflicts with JavaScript's built-in Error
export { DartError as Error };
