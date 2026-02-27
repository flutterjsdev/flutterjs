// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// dart:core Duration - Time span representation
// Based on: flutter/bin/cache/pkg/sky_engine/lib/core/duration.dart
// ============================================================================

/**
 * A span of time, such as 27 days, 4 hours, 12 minutes, and 3 seconds.
 *
 * A `Duration` represents a difference from one point in time to another.
 * The duration may be "negative" if the difference is from a later time to an earlier.
 *
 * Example:
 * ```js
 * const fastestMarathon = new Duration({ hours: 2, minutes: 3, seconds: 2 });
 * console.log(fastestMarathon.inMinutes); // 123
 * ```
 */
export class Duration {
  // ============================================================================
  // Static constants - Time conversion factors
  // ============================================================================

  /** The number of microseconds per millisecond. */
  static microsecondsPerMillisecond = 1000;

  /** The number of milliseconds per second. */
  static millisecondsPerSecond = 1000;

  /** The number of seconds per minute. */
  static secondsPerMinute = 60;

  /** The number of minutes per hour. */
  static minutesPerHour = 60;

  /** The number of hours per day. */
  static hoursPerDay = 24;

  /** The number of microseconds per second. */
  static microsecondsPerSecond =
    Duration.microsecondsPerMillisecond * Duration.millisecondsPerSecond;

  /** The number of microseconds per minute. */
  static microsecondsPerMinute =
    Duration.microsecondsPerSecond * Duration.secondsPerMinute;

  /** The number of microseconds per hour. */
  static microsecondsPerHour =
    Duration.microsecondsPerMinute * Duration.minutesPerHour;

  /** The number of microseconds per day. */
  static microsecondsPerDay =
    Duration.microsecondsPerHour * Duration.hoursPerDay;

  /** The number of milliseconds per minute. */
  static millisecondsPerMinute =
    Duration.millisecondsPerSecond * Duration.secondsPerMinute;

  /** The number of milliseconds per hour. */
  static millisecondsPerHour =
    Duration.millisecondsPerMinute * Duration.minutesPerHour;

  /** The number of milliseconds per day. */
  static millisecondsPerDay =
    Duration.millisecondsPerHour * Duration.hoursPerDay;

  /** The number of seconds per hour. */
  static secondsPerHour =
    Duration.secondsPerMinute * Duration.minutesPerHour;

  /** The number of seconds per day. */
  static secondsPerDay =
    Duration.secondsPerHour * Duration.hoursPerDay;

  /** The number of minutes per day. */
  static minutesPerDay =
    Duration.minutesPerHour * Duration.hoursPerDay;

  /** An empty duration, representing zero time. */
  static zero = new Duration({ seconds: 0 });

  // ============================================================================
  // Instance properties
  // ============================================================================

  /** @private The total microseconds of this Duration object. */
  _duration;

  /**
   * Creates a new Duration object whose value is the sum of all individual parts.
   *
   * @param {Object} options - Duration components
   * @param {number} [options.days=0] - Number of days
   * @param {number} [options.hours=0] - Number of hours
   * @param {number} [options.minutes=0] - Number of minutes
   * @param {number} [options.seconds=0] - Number of seconds
   * @param {number} [options.milliseconds=0] - Number of milliseconds
   * @param {number} [options.microseconds=0] - Number of microseconds
   */
  constructor({
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
    microseconds = 0,
  } = {}) {
    // Calculate total microseconds from all components
    const totalMicroseconds =
      microseconds +
      Duration.microsecondsPerMillisecond * milliseconds +
      Duration.microsecondsPerSecond * seconds +
      Duration.microsecondsPerMinute * minutes +
      Duration.microsecondsPerHour * hours +
      Duration.microsecondsPerDay * days;

    // The `+ 0` prevents -0.0 on the web
    this._duration = totalMicroseconds + 0;
  }

  /**
   * Internal constructor that takes microseconds directly.
   * @private
   */
  static _microseconds(duration) {
    const d = Object.create(Duration.prototype);
    d._duration = duration + 0; // Prevent -0.0
    return d;
  }

  // ============================================================================
  // Operators
  // ============================================================================

  /**
   * Adds this Duration and other and returns the sum as a new Duration object.
   * @param {Duration} other
   * @returns {Duration}
   */
  add(other) {
    return Duration._microseconds(this._duration + other._duration);
  }

  /**
   * Subtracts other from this Duration and returns the difference as a new Duration object.
   * @param {Duration} other
   * @returns {Duration}
   */
  subtract(other) {
    return Duration._microseconds(this._duration - other._duration);
  }

  /**
   * Multiplies this Duration by the given factor and returns the result as a new Duration object.
   * @param {number} factor
   * @returns {Duration}
   */
  multiply(factor) {
    return Duration._microseconds(Math.round(this._duration * factor));
  }

  /**
   * Divides this Duration by the given quotient and returns the truncated result as a new Duration object.
   * @param {number} quotient
   * @returns {Duration}
   */
  divide(quotient) {
    if (quotient === 0) {
      throw new Error('IntegerDivisionByZeroException');
    }
    return Duration._microseconds(Math.trunc(this._duration / quotient));
  }

  /**
   * Whether this Duration is shorter than other.
   * @param {Duration} other
   * @returns {boolean}
   */
  lessThan(other) {
    return this._duration < other._duration;
  }

  /**
   * Whether this Duration is longer than other.
   * @param {Duration} other
   * @returns {boolean}
   */
  greaterThan(other) {
    return this._duration > other._duration;
  }

  /**
   * Whether this Duration is shorter than or equal to other.
   * @param {Duration} other
   * @returns {boolean}
   */
  lessThanOrEqual(other) {
    return this._duration <= other._duration;
  }

  /**
   * Whether this Duration is longer than or equal to other.
   * @param {Duration} other
   * @returns {boolean}
   */
  greaterThanOrEqual(other) {
    return this._duration >= other._duration;
  }

  // ============================================================================
  // Time unit getters
  // ============================================================================

  /**
   * The number of entire days spanned by this Duration.
   * @returns {number}
   */
  get inDays() {
    return Math.trunc(this._duration / Duration.microsecondsPerDay);
  }

  /**
   * The number of entire hours spanned by this Duration.
   * The returned value can be greater than 23.
   * @returns {number}
   */
  get inHours() {
    return Math.trunc(this._duration / Duration.microsecondsPerHour);
  }

  /**
   * The number of whole minutes spanned by this Duration.
   * The returned value can be greater than 59.
   * @returns {number}
   */
  get inMinutes() {
    return Math.trunc(this._duration / Duration.microsecondsPerMinute);
  }

  /**
   * The number of whole seconds spanned by this Duration.
   * The returned value can be greater than 59.
   * @returns {number}
   */
  get inSeconds() {
    return Math.trunc(this._duration / Duration.microsecondsPerSecond);
  }

  /**
   * The number of whole milliseconds spanned by this Duration.
   * The returned value can be greater than 999.
   * @returns {number}
   */
  get inMilliseconds() {
    return Math.trunc(this._duration / Duration.microsecondsPerMillisecond);
  }

  /**
   * The number of whole microseconds spanned by this Duration.
   * @returns {number}
   */
  get inMicroseconds() {
    return this._duration;
  }

  // ============================================================================
  // Comparison and utility methods
  // ============================================================================

  /**
   * Whether this Duration has the same length as other.
   * @param {*} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof Duration && this._duration === other.inMicroseconds;
  }

  /**
   * Compares this Duration to other, returning zero if the values are equal.
   * Returns a negative integer if this Duration is shorter than other,
   * or a positive integer if it is longer.
   * @param {Duration} other
   * @returns {number}
   */
  compareTo(other) {
    if (this._duration < other._duration) return -1;
    if (this._duration > other._duration) return 1;
    return 0;
  }

  /**
   * Returns a string representation of this Duration.
   * Format: H:MM:SS.mmmmmm
   * @returns {string}
   */
  toString() {
    let microseconds = this.inMicroseconds;
    let sign = '';
    const negative = microseconds < 0;

    let hours = Math.trunc(microseconds / Duration.microsecondsPerHour);
    microseconds = microseconds % Duration.microsecondsPerHour;

    // Correcting for being negative after first division
    if (negative) {
      hours = 0 - hours; // Not using -hours to avoid -0.0 on web
      microseconds = 0 - microseconds;
      sign = '-';
    }

    const minutes = Math.trunc(microseconds / Duration.microsecondsPerMinute);
    microseconds = microseconds % Duration.microsecondsPerMinute;

    const minutesPadding = minutes < 10 ? '0' : '';

    const seconds = Math.trunc(microseconds / Duration.microsecondsPerSecond);
    microseconds = microseconds % Duration.microsecondsPerSecond;

    const secondsPadding = seconds < 10 ? '0' : '';

    // Padding up to six digits for microseconds
    const microsecondsText = String(microseconds).padStart(6, '0');

    return `${sign}${hours}:${minutesPadding}${minutes}:${secondsPadding}${seconds}.${microsecondsText}`;
  }

  /**
   * Whether this Duration is negative.
   * A negative Duration represents the difference from a later time to an earlier time.
   * @returns {boolean}
   */
  get isNegative() {
    return this._duration < 0;
  }

  /**
   * Creates a new Duration representing the absolute length of this Duration.
   * @returns {Duration}
   */
  abs() {
    return Duration._microseconds(Math.abs(this._duration));
  }

  /**
   * Creates a new Duration with the opposite direction of this Duration.
   * @returns {Duration}
   */
  negate() {
    return Duration._microseconds(0 - this._duration);
  }

  /**
   * Returns the hash code for this Duration.
   * @returns {number}
   */
  get hashCode() {
    return this._duration;
  }
}

// For compatibility with older code that might use operator overloading syntax
// These are not standard JS but might be used in generated code
Duration.prototype['+'] = Duration.prototype.add;
Duration.prototype['-'] = Duration.prototype.subtract;
Duration.prototype['*'] = Duration.prototype.multiply;
Duration.prototype['~/'] = Duration.prototype.divide;
Duration.prototype['<'] = Duration.prototype.lessThan;
Duration.prototype['>'] = Duration.prototype.greaterThan;
Duration.prototype['<='] = Duration.prototype.lessThanOrEqual;
Duration.prototype['>='] = Duration.prototype.greaterThanOrEqual;
Duration.prototype['=='] = Duration.prototype.equals;
Duration.prototype['unary-'] = Duration.prototype.negate;

export default Duration;
