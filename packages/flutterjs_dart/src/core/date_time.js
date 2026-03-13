// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * dart:core DateTime implementation
 * JavaScript implementation of Dart's DateTime class
 */

import { Duration } from './duration.js';

export class DateTime {
  constructor(year, month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0, microsecond = 0) {
    // Store the underlying JavaScript Date
    this._date = new Date(year, month - 1, day, hour, minute, second, millisecond);
    this._microsecond = microsecond; // JS Date doesn't support microseconds
    this._isUtc = false;
  }

  // Internal constructor from Date object
  static _fromDate(date, isUtc = false) {
    const dt = Object.create(DateTime.prototype);
    dt._date = date;
    dt._microsecond = 0;
    dt._isUtc = isUtc;
    return dt;
  }

  // Create a DateTime in UTC time zone
  static utc(year, month = 1, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0, microsecond = 0) {
    const dt = Object.create(DateTime.prototype);
    dt._date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    dt._microsecond = microsecond;
    dt._isUtc = true;
    return dt;
  }

  // Create a DateTime representing the current instant
  static now() {
    return DateTime._fromDate(new Date(), false);
  }

  // Parse a date-time string in ISO 8601 format
  static parse(formattedString) {
    const date = new Date(formattedString);
    if (isNaN(date.getTime())) {
      throw new FormatException('Invalid date format', formattedString);
    }
    // Check if the string indicates UTC (ends with Z or has timezone offset)
    const isUtc = formattedString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(formattedString);
    return DateTime._fromDate(date, isUtc);
  }

  // Try to parse, return null on failure
  static tryParse(formattedString) {
    try {
      return DateTime.parse(formattedString);
    } catch (e) {
      return null;
    }
  }

  // Create from milliseconds since Unix epoch
  static fromMillisecondsSinceEpoch(millisecondsSinceEpoch, { isUtc = false } = {}) {
    return DateTime._fromDate(new Date(millisecondsSinceEpoch), isUtc);
  }

  // Create from microseconds since Unix epoch
  static fromMicrosecondsSinceEpoch(microsecondsSinceEpoch, { isUtc = false } = {}) {
    const ms = Math.floor(microsecondsSinceEpoch / 1000);
    const us = microsecondsSinceEpoch % 1000;
    const dt = DateTime._fromDate(new Date(ms), isUtc);
    dt._microsecond = us;
    return dt;
  }

  // Getters
  get year() {
    return this._isUtc ? this._date.getUTCFullYear() : this._date.getFullYear();
  }

  get month() {
    return (this._isUtc ? this._date.getUTCMonth() : this._date.getMonth()) + 1;
  }

  get day() {
    return this._isUtc ? this._date.getUTCDate() : this._date.getDate();
  }

  get hour() {
    return this._isUtc ? this._date.getUTCHours() : this._date.getHours();
  }

  get minute() {
    return this._isUtc ? this._date.getUTCMinutes() : this._date.getMinutes();
  }

  get second() {
    return this._isUtc ? this._date.getUTCSeconds() : this._date.getSeconds();
  }

  get millisecond() {
    return this._isUtc ? this._date.getUTCMilliseconds() : this._date.getMilliseconds();
  }

  get microsecond() {
    return this._microsecond;
  }

  get weekday() {
    const day = this._isUtc ? this._date.getUTCDay() : this._date.getDay();
    // JavaScript: 0=Sunday, 6=Saturday
    // Dart: 1=Monday, 7=Sunday
    return day === 0 ? 7 : day;
  }

  get millisecondsSinceEpoch() {
    return this._date.getTime();
  }

  get microsecondsSinceEpoch() {
    return this._date.getTime() * 1000 + this._microsecond;
  }

  get isUtc() {
    return this._isUtc;
  }

  get timeZoneName() {
    if (this._isUtc) return 'UTC';
    // This is a simplified version - JavaScript doesn't provide easy access to timezone names
    return new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
      .formatToParts(this._date)
      .find(part => part.type === 'timeZoneName')?.value || '';
  }

  get timeZoneOffset() {
    if (this._isUtc) return { inMinutes: 0 };
    const offset = -this._date.getTimezoneOffset(); // Note: getTimezoneOffset returns opposite sign
    return {
      inMinutes: offset,
      inHours: offset / 60
    };
  }

  // Conversions
  toUtc() {
    if (this._isUtc) return this;
    return DateTime._fromDate(new Date(this._date.getTime()), true);
  }

  toLocal() {
    if (!this._isUtc) return this;
    return DateTime._fromDate(new Date(this._date.getTime()), false);
  }

  // Arithmetic
  add(duration) {
    const newMs = this._date.getTime() + duration.inMilliseconds;
    const dt = DateTime._fromDate(new Date(newMs), this._isUtc);
    dt._microsecond = this._microsecond;
    return dt;
  }

  subtract(duration) {
    const newMs = this._date.getTime() - duration.inMilliseconds;
    const dt = DateTime._fromDate(new Date(newMs), this._isUtc);
    dt._microsecond = this._microsecond;
    return dt;
  }

  difference(other) {
    const diffMs = this._date.getTime() - other._date.getTime();
    const diffUs = this._microsecond - other._microsecond;
    return new Duration({ milliseconds: diffMs, microseconds: diffUs });
  }

  // Comparison
  compareTo(other) {
    const diff = this._date.getTime() - other._date.getTime();
    if (diff < 0) return -1;
    if (diff > 0) return 1;
    const usDiff = this._microsecond - other._microsecond;
    if (usDiff < 0) return -1;
    if (usDiff > 0) return 1;
    return 0;
  }

  isBefore(other) {
    return this.compareTo(other) < 0;
  }

  isAfter(other) {
    return this.compareTo(other) > 0;
  }

  isAtSameMomentAs(other) {
    return this.compareTo(other) === 0;
  }

  // String conversion
  toIso8601String() {
    if (this._isUtc) {
      return this._date.toISOString();
    }
    // Format local time as ISO 8601
    const pad = (n) => String(n).padStart(2, '0');
    const year = this.year;
    const month = pad(this.month);
    const day = pad(this.day);
    const hour = pad(this.hour);
    const minute = pad(this.minute);
    const second = pad(this.second);
    const ms = String(this.millisecond).padStart(3, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}`;
  }

  toString() {
    return this.toIso8601String();
  }
}

// Also need FormatException for parse errors
class FormatException extends Error {
  constructor(message, source) {
    super(message);
    this.name = 'FormatException';
    this.source = source;
  }
}
