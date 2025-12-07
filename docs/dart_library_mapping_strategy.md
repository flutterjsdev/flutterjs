# Dart Library Mapping Strategy

## Core Philosophy

**For each Dart library:**

1. **Check if JavaScript equivalent exists** → Wrap it (1-2 days)
2. **If partial match** → Bridge the gaps (3-5 days)
3. **If no equivalent** → Build minimal implementation (rare, 1-2 weeks)
4. **If platform-specific (dart:io)** → Skip or provide Web APIs stub

---

## Dart Standard Library Mapping

### Core Libraries (Always Need)

#### `dart:core` ✅ WRAP (JavaScript built-ins)

| Dart | JavaScript | Status | Effort |
|------|------------|--------|--------|
| `int`, `double`, `num` | `Number` | 1:1 | Wrapper |
| `String` | `String` | 1:1 | Wrapper |
| `List<T>` | `Array` | 1:1 | Wrapper |
| `Map<K,V>` | `Object` / `Map` | 1:1 | Wrapper |
| `Set<T>` | `Set` | 1:1 | Wrapper |
| `bool` | `boolean` | 1:1 | Wrapper |
| `Iterable<T>` | `Array` + methods | Similar | Wrapper |
| `Duration` | Custom class | Different | Build |
| `DateTime` | `Date` | Similar | Wrapper + extend |
| `Exception` | `Error` | 1:1 | Wrapper |
| `Comparable` | Custom interface | Different | Wrapper |

**Implementation:**
```javascript
// @flutterjs/dart-compat/core.js

// Primitives - no wrapper needed, JS has these
export class int extends Number {}
export class double extends Number {}
export class String extends String {}
export const bool = Boolean;

// Collections - wrap with Dart API
export class List extends Array {
  add(element) { this.push(element); return this; }
  remove(element) { 
    const idx = this.indexOf(element);
    if (idx > -1) this.splice(idx, 1);
  }
  contains(element) { return this.includes(element); }
  isEmpty() { return this.length === 0; }
  get length() { return Array.prototype.length.call(this); }
  get first() { return this[0]; }
  get last() { return this[this.length - 1]; }
  get reversed() { return new List(...this.reverse()); }
  
  map(f) { return new List(...Array.prototype.map.call(this, f)); }
  where(f) { return new List(...Array.prototype.filter.call(this, f)); }
  expand(f) { return new List(...Array.prototype.flatMap.call(this, f)); }
  fold(initial, combine) { return Array.prototype.reduce.call(this, combine, initial); }
  reduce(combine) { return Array.prototype.reduce.call(this, combine); }
  forEach(f) { return Array.prototype.forEach.call(this, f); }
}

export class Map extends global.Map {
  addAll(other) { 
    for (let [k, v] of Object.entries(other)) this.set(k, v);
    return this;
  }
  containsKey(key) { return this.has(key); }
  containsValue(value) { return [...this.values()].includes(value); }
  remove(key) { 
    const val = this.get(key);
    this.delete(key);
    return val;
  }
  get isEmpty() { return this.size === 0; }
  get isNotEmpty() { return this.size > 0; }
  get keys() { return [...this.keys()]; }
  get values() { return [...this.values()]; }
}

export class Set extends global.Set {
  add(element) { super.add(element); return this; }
  addAll(elements) { 
    elements.forEach(e => this.add(e));
    return this;
  }
  contains(element) { return this.has(element); }
  get isEmpty() { return this.size === 0; }
  get isNotEmpty() { return this.size > 0; }
  
  union(other) { return new Set([...this, ...other]); }
  intersection(other) { return new Set([...this].filter(e => other.has(e))); }
  difference(other) { return new Set([...this].filter(e => !other.has(e))); }
}

// DateTime - Dart has more features, wrap Date
export class DateTime {
  constructor(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
    this._date = new Date(year, month - 1, day, hour, minute, second, millisecond);
  }
  
  static now() {
    const d = new DateTime(0);
    d._date = new Date();
    return d;
  }
  
  static parse(str) {
    const d = new DateTime(0);
    d._date = new Date(str);
    return d;
  }
  
  get year() { return this._date.getFullYear(); }
  get month() { return this._date.getMonth() + 1; }
  get day() { return this._date.getDate(); }
  get hour() { return this._date.getHours(); }
  get minute() { return this._date.getMinutes(); }
  get second() { return this._date.getSeconds(); }
  
  get millisecondsSinceEpoch() { return this._date.getTime(); }
  get microsecondsSinceEpoch() { return this._date.getTime() * 1000; }
  
  isBefore(other) { return this._date < other._date; }
  isAfter(other) { return this._date > other._date; }
  isAtSameMomentAs(other) { return this._date.getTime() === other._date.getTime(); }
  
  add(duration) {
    const result = new DateTime(
      this.year, this.month, this.day,
      this.hour, this.minute, this.second
    );
    result._date = new Date(this._date.getTime() + duration.inMilliseconds);
    return result;
  }
  
  subtract(duration) {
    const result = new DateTime(
      this.year, this.month, this.day,
      this.hour, this.minute, this.second
    );
    result._date = new Date(this._date.getTime() - duration.inMilliseconds);
    return result;
  }
  
  difference(other) {
    const diff = this._date.getTime() - other._date.getTime();
    return new Duration({ milliseconds: diff });
  }
  
  toString() { return this._date.toISOString(); }
}

// Duration - no direct JS equivalent, build it
export class Duration {
  constructor({ days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 }) {
    this.inMilliseconds = 
      days * 86400000 +
      hours * 3600000 +
      minutes * 60000 +
      seconds * 1000 +
      milliseconds;
  }
  
  get inDays() { return Math.floor(this.inMilliseconds / 86400000); }
  get inHours() { return Math.floor(this.inMilliseconds / 3600000); }
  get inMinutes() { return Math.floor(this.inMilliseconds / 60000); }
  get inSeconds() { return Math.floor(this.inMilliseconds / 1000); }
  
  isNegative() { return this.inMilliseconds < 0; }
  
  operator_plus(other) {
    return new Duration({ milliseconds: this.inMilliseconds + other.inMilliseconds });
  }
  
  operator_minus(other) {
    return new Duration({ milliseconds: this.inMilliseconds - other.inMilliseconds });
  }
  
  operator_multiply(factor) {
    return new Duration({ milliseconds: this.inMilliseconds * factor });
  }
  
  operator_divide(divisor) {
    return new Duration({ milliseconds: this.inMilliseconds / divisor });
  }
}

export class Exception extends Error {
  constructor(message = '') {
    super(message);
    this.message = message;
  }
}

export class RangeError extends Exception {
  constructor(message) {
    super(`RangeError: ${message}`);
  }
}

export class FormatException extends Exception {
  constructor(message, source = '', offset = 0) {
    super(`FormatException: ${message} at position ${offset}`);
    this.source = source;
    this.offset = offset;
  }
}
```

**Effort:** 1-2 days (mostly wrapping, some custom implementations)

---

#### `dart:async` ✅ WRAP (JavaScript Promises/async)

| Dart | JavaScript | Status | Effort |
|------|------------|--------|--------|
| `Future<T>` | `Promise<T>` | 1:1 | Wrapper |
| `Stream<T>` | `AsyncIterable` / RxJS | Similar | Wrapper + bridge |
| `Completer<T>` | Custom class | Different | Build |
| `Timer` | `setTimeout` | 1:1 | Wrapper |
| `Zone` | No equivalent | N/A | Skip or mock |

**Implementation:**
```javascript
// @flutterjs/dart-compat/async.js

export class Future extends Promise {
  static delayed(duration, computation) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(computation?.());
      }, duration);
    });
  }
  
  static wait(futures) {
    return Promise.all(futures);
  }
  
  static value(value) {
    return Promise.resolve(value);
  }
  
  static error(error) {
    return Promise.reject(error);
  }
  
  then(onValue, onError) {
    return super.then(onValue, onError);
  }
  
  catch(onError) {
    return super.catch(onError);
  }
  
  whenComplete(action) {
    return super.finally(action);
  }
  
  timeout(timeLimit, onTimeout) {
    return Promise.race([
      this,
      new Promise((_, reject) =>
        setTimeout(() => {
          if (onTimeout) {
            reject(onTimeout());
          } else {
            reject(new Error('Future timed out'));
          }
        }, timeLimit)
      )
    ]);
  }
}

export class Stream {
  constructor(generator) {
    this._generator = generator;
  }
  
  static fromFuture(future) {
    return new Stream(async function* () {
      yield await future;
    }());
  }
  
  static fromIterable(iterable) {
    return new Stream(function* () {
      for (const item of iterable) {
        yield item;
      }
    }());
  }
  
  listen(onData, { onError, onDone } = {}) {
    return new StreamSubscription(this._generator, onData, onError, onDone);
  }
  
  map(transform) {
    const self = this;
    return new Stream(async function* () {
      for await (const item of self._generator) {
        yield transform(item);
      }
    }());
  }
  
  where(test) {
    const self = this;
    return new Stream(async function* () {
      for await (const item of self._generator) {
        if (test(item)) {
          yield item;
        }
      }
    }());
  }
  
  expand(convert) {
    const self = this;
    return new Stream(async function* () {
      for await (const item of self._generator) {
        for (const subitem of convert(item)) {
          yield subitem;
        }
      }
    }());
  }
  
  async toList() {
    const list = [];
    for await (const item of this._generator) {
      list.push(item);
    }
    return list;
  }
  
  async reduce(combine) {
    let value;
    let first = true;
    for await (const item of this._generator) {
      if (first) {
        value = item;
        first = false;
      } else {
        value = combine(value, item);
      }
    }
    return value;
  }
  
  async forEach(action) {
    for await (const item of this._generator) {
      action(item);
    }
  }
}

export class StreamSubscription {
  constructor(generator, onData, onError, onDone) {
    this._cancelled = false;
    this._startListening(generator, onData, onError, onDone);
  }
  
  async _startListening(generator, onData, onError, onDone) {
    try {
      for await (const item of generator) {
        if (this._cancelled) break;
        onData?.(item);
      }
      onDone?.();
    } catch (error) {
      onError?.(error);
    }
  }
  
  cancel() {
    this._cancelled = true;
  }
  
  pause() { /* TODO */ }
  resume() { /* TODO */ }
}

export class Completer {
  constructor() {
    this.future = new Promise((resolve, reject) => {
      this.complete = resolve;
      this.completeError = reject;
    });
  }
}

export class Timer {
  constructor(duration, callback) {
    this._id = setTimeout(callback, duration);
  }
  
  static periodic(duration, callback) {
    const timerId = setInterval(() => {
      // In Dart, periodic timer passes count
      callback(new Timer.__PeriodicTimer());
    }, duration);
    
    return new Timer.__PeriodicTimer(timerId);
  }
  
  cancel() {
    clearTimeout(this._id);
  }
  
  isActive() {
    // JS doesn't expose this, we need to track
    return this._id !== null;
  }
  
  static __PeriodicTimer = class {
    constructor(id) {
      this._id = id;
    }
    cancel() {
      clearInterval(this._id);
    }
  };
}
```

**Effort:** 2-3 days (Promises are native, Streams need async generators)

---

#### `dart:convert` ✅ WRAP (JavaScript JSON + encoders)

| Dart | JavaScript | Status | Effort |
|------|------------|--------|--------|
| `jsonDecode()` | `JSON.parse()` | 1:1 | Wrapper |
| `jsonEncode()` | `JSON.stringify()` | 1:1 | Wrapper |
| `utf8` | `TextEncoder` | Similar | Wrapper |
| `base64` | `btoa()/atob()` | Similar | Wrapper |
| `jsonEncoder` | Custom | Different | Build |

**Implementation:**
```javascript
// @flutterjs/dart-compat/convert.js

export function jsonDecode(source) {
  return JSON.parse(source);
}

export function jsonEncode(object) {
  return JSON.stringify(object);
}

export const utf8 = {
  decode: (bytes) => {
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  },
  
  encode: (string) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(string));
  }
};

export const base64 = {
  encode: (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
  
  decode: (string) => {
    const binary = atob(string);
    const bytes = [];
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i));
    }
    return bytes;
  }
};

export const hex = {
  encode: (bytes) => {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  
  decode: (string) => {
    const bytes = [];
    for (let i = 0; i < string.length; i += 2) {
      bytes.push(parseInt(string.substr(i, 2), 16));
    }
    return bytes;
  }
};
```

**Effort:** 1 day (mostly direct wrappers)

---

#### `dart:math` ✅ WRAP (JavaScript Math)

| Dart | JavaScript | Status | Effort |
|------|------------|--------|--------|
| `sqrt()`, `pow()`, `sin()`, etc. | `Math.*` | 1:1 | Wrapper |
| `Random` | Custom | Different | Build minimal |
| `Point` | Custom class | Different | Build |
| `Rectangle` | Custom class | Different | Build |

**Implementation:**
```javascript
// @flutterjs/dart-compat/math.js

export const math = {
  // Constants
  PI: Math.PI,
  E: Math.E,
  
  // Functions
  sqrt: Math.sqrt,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  exp: Math.exp,
  log: Math.log,
  log10: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
};

export class Random {
  constructor(seed) {
    // Simple seeded RNG (Dart uses Mersenne Twister, but simple for MVP)
    this._seed = seed || Math.random() * 2147483647;
  }
  
  nextInt(max) {
    return Math.floor(Math.random() * max);
  }
  
  nextDouble() {
    return Math.random();
  }
  
  nextBool() {
    return Math.random() > 0.5;
  }
}

export class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  
  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }
  
  translate(dx, dy) {
    return new Point(this.x + dx, this.y + dy);
  }
}

export class Rectangle {
  constructor(left, top, width, height) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
  }
  
  get right() { return this.left + this.width; }
  get bottom() { return this.top + this.height; }
  
  containsPoint(point) {
    return point.x >= this.left && point.x <= this.right &&
           point.y >= this.top && point.y <= this.bottom;
  }
}
```

**Effort:** 1 day (mostly direct mapping)

---

### Networking Libraries

#### `dart:io` (HTTP Client) ✅ WRAP (node-fetch / fetch API)

| Dart | JavaScript | Status | Effort |
|------|------------|--------|--------|
| `http.get()` | `fetch()` | Similar | Wrapper |
| `http.post()` | `fetch(..., {method:'POST'})` | Similar | Wrapper |
| `HttpClient` | `fetch` | Similar | Wrapper |
| `WebSocket` | `WebSocket` | 1:1 | Wrapper |
| File I/O | N/A for web | Skip | N/A |

**Implementation:**
```javascript
// @flutterjs/dart-compat/io.js

export class HttpRequest {
  constructor(method, url, headers = {}, body = null) {
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
  }
  
  async send() {
    const response = await fetch(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body
    });
    
    return new HttpResponse(response);
  }
}

export class HttpResponse {
  constructor(fetchResponse) {
    this.statusCode = fetchResponse.status;
    this.reasonPhrase = fetchResponse.statusText;
    this._headers = fetchResponse.headers;
    this._bodyPromise = fetchResponse.text();
  }
  
  async get body() {
    if (!this._body) {
      this._body = await this._bodyPromise;
    }
    return this._body;
  }
  
  get headers() {
    const obj = {};
    for (let [key, value] of this._headers) {
      obj[key] = value;
    }
    return obj;
  }
}

export const http = {
  get: async (uri, headers = {}) => {
    const req = new HttpRequest('GET', uri.toString(), headers);
    return req.send();
  },
  
  post: async (uri, headers = {}, body = '') => {
    const req = new HttpRequest('POST', uri.toString(), headers, body);
    return req.send();
  },
  
  put: async (uri, headers = {}, body = '') => {
    const req = new HttpRequest('PUT', uri.toString(), headers, body);
    return req.send();
  },
  
  delete: async (uri, headers = {}) => {
    const req = new HttpRequest('DELETE', uri.toString(), headers);
    return req.send();
  },
  
  patch: async (uri, headers = {}, body = '') => {
    const req = new HttpRequest('PATCH', uri.toString(), headers, body);
    return req.send();
  }
};

export class Uri {
  constructor(scheme = '', host = '', path = '', queryParameters = {}) {
    this.scheme = scheme;
    this.host = host;
    this.path = path;
    this.queryParameters = queryParameters;
  }
  
  static parse(uriString) {
    const url = new URL(uriString);
    const queryParams = {};
    for (let [key, value] of url.searchParams) {
      queryParams[key] = value;
    }
    
    return new Uri(
      url.protocol.replace(':', ''),
      url.host,
      url.pathname,
      queryParams
    );
  }
  
  toString() {
    const query = new URLSearchParams(this.queryParameters).toString();
    return `${this.scheme}://${this.host}${this.path}${query ? '?' + query : ''}`;
  }
}

export class WebSocket {
  constructor(url) {
    this._socket = new global.WebSocket(url);
  }
  
  addEventListener(event, callback) {
    this._socket.addEventListener(event, callback);
  }
  
  send(data) {
    this._socket.send(data);
  }
  
  close() {
    this._socket.close();
  }
}
```

**Effort:** 1-2 days (fetch is native, just wrap)

---

### External Packages (Popular Flutter Packages)

#### `package:http` ✅ USE (npm: axios or node-fetch wrapper)

Instead of implementing from scratch, wrap existing npm package:

```javascript
// @flutterjs/http/index.js
// Wraps npm 'axios' in Dart's http API

import axios from 'axios';

export class Client {
  async get(url, headers = {}) {
    const response = await axios.get(url, { headers });
    return new Response(response);
  }
  
  async post(url, headers = {}, body = '') {
    const response = await axios.post(url, body, { headers });
    return new Response(response);
  }
  
  // ... other methods
}

export async function get(url, headers = {}) {
  const client = new Client();
  return client.get(url, headers);
}

class Response {
  constructor(axiosResponse) {
    this.statusCode = axiosResponse.status;
    this.headers = axiosResponse.headers;
    this.bodyBytes = axiosResponse.data;
  }
  
  get body() {
    return typeof this.bodyBytes === 'string' 
      ? this.bodyBytes 
      : JSON.stringify(this.bodyBytes);
  }
}
```

**NPM Package Used:** `axios` or `node-fetch`
**Effort:** Few hours (just wrapping)

---

#### `package:provider` ✅ BUILD (State management pattern)

Dart's Provider is for Flutter state. Create JavaScript equivalent:

```javascript
// @flutterjs/provider/index.js

export class ChangeNotifier {
  constructor() {
    this._listeners = new Set();
  }
  
  addListener(callback) {
    this._listeners.add(callback);
  }
  
  removeListener(callback) {
    this._listeners.delete(callback);
  }
  
  notifyListeners() {
    this._listeners.forEach(callback => callback());
  }
}

export class StateProvider {
  constructor(initialValue) {
    this._value = initialValue;
    this._notifier = new ChangeNotifier();
  }
  
  get value() {
    return this._value;
  }
  
  set value(newValue) {
    this._value = newValue;
    this._notifier.notifyListeners();
  }
  
  addListener(callback) {
    return this._notifier.addListener(callback);
  }
}

// Usage in Flutter.js
export function useProvider(provider) {
  const [value, setValue] = useState(provider.value);
  
  useEffect(() => {
    const unsubscribe = provider.addListener(() => {
      setValue(provider.value);
    });
    return unsubscribe;
  }, [provider]);
  
  return value;
}
```

**Effort:** 2-3 days (custom implementation, but simple pattern)

---

#### `package:dio` ✅ WRAP (npm: axios)

Dio is HTTP client, similar to package:http:

```javascript
// @flutterjs/dio/index.js
// Wrap axios with Dio API

import axios from 'axios';

export class Dio {
  constructor({ baseUrl = '', connectTimeout = 30000 } = {}) {
    this._instance = axios.create({ baseURL: baseUrl, timeout: connectTimeout });
  }
  
  async get(path, queryParameters = {}) {
    const response = await this._instance.get(path, { params: queryParameters });
    return new Response(response);
  }
  
  async post(path, { data, queryParameters = {} } = {}) {
    const response = await this._instance.post(path, data, { params: queryParameters });
    return new Response(response);
  }
  
  async put(path, { data } = {}) {
    const response = await this._instance.put(path, data);
    return new Response(response);
  }
  
  async delete(path) {
    const response = await this._instance.delete(path);
    return new Response(response);
  }
}

class Response {
  constructor(axiosResponse) {
    this.statusCode = axiosResponse.status;
    this.statusMessage = axiosResponse.statusText;
    this.data = axiosResponse.data;
  }
}
```

**NPM Package Used:** `axios`
**Effort:** Few hours

---

#### `package:intl` ⚠️ WRAP (npm: date-fns or moment)

Internationalization and number formatting:

```javascript
// @flutterjs/intl/index.js
// Wrap date-fns for Dart's intl API

import { format, parse } from 'date-fns';

export class DateFormat {
  constructor(pattern) {
    this._pattern = pattern;
  }
  
  format(date) {
    return format(date._date || date, this._pattern);
  }
  
  parse(string) {
    return parse(string, this._pattern, new Date());
  }
}

export const numberFormat = {
  format: (number, pattern) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }
};

export const currencyFormat = {
  format: (amount, symbol) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: symbol || 'USD'
    }).format(amount);
  }
};
```

**NPM Package Used:** `date-fns` or `moment`
**Effort:** 1 day

---

#### `package:uuid` ✅ WRAP (npm: uuid)

Generate UUIDs:

```javascript
// @flutterjs/uuid/index.js

import { v4, v1 } from 'uuid';

export class Uuid {
  static v4() {
    return v4();
  }
  
  static v1() {
    return v1();
  }
}

// Or for Dart: import 'package:uuid/uuid.dart';
export function generateV4() {
  return v4();
}
```

**NPM Package Used:** `uuid`
**Effort:** Few hours

---

#### `package:firebase_core` ⚠️ WRAP (npm: firebase)

Firebase SDK exists for JavaScript:

```javascript
// @flutterjs/firebase/index.js

import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

export class Firebase {
  static initializeApp(config) {
    return firebase.initializeApp(config);
  }
}

export const firebaseAuth = firebase.auth;
export const firebaseFirestore = firebase.firestore;
```

**NPM Package Used:** `firebase`
**Effort:** 1-2 days (wrapping, not building)

---

#### `package:google_maps_flutter` ❌ SKIP / USE WEB API

Google Maps has a web API:

```javascript
// @flutterjs/google_maps/index.js

export class GoogleMap {
  constructor({ apiKey, initialCameraPosition }) {
    this._apiKey = apiKey;
    this._map = null;
  }
  
  async initialize() {
    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this._apiKey}`;
    await new Promise(resolve => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }
  
  setCenter(latitude, longitude) {
    this._map.setCenter({ lat: latitude, lng: longitude });
  }
}
```

**Effort:** Minimal (use Google Maps Web API directly)

---

### Complete Library Mapping Table

| Dart Library/Package | npm Equivalent | Status | Effort | Notes |
|---|---|---|---|---|
| `dart:core` | (built-ins) | ✅ Wrap | 1-2 days | List, Map, Set, Duration, DateTime |
| `dart:async` | Promise/async | ✅ Wrap | 2-3 days | Future, Stream, Timer, Completer |
| `dart:convert` | JSON API | ✅ Wrap | 1 day | jsonDecode, jsonEncode, utf8, base64 |
| `dart:math` | Math object | ✅ Wrap | 1 day | sqrt, sin, cos, Random, Point |
| `dart:io` | fetch/axios | ✅ Wrap | 1-2 days | http.get/post, Uri, HttpClient |
| `dart:html` | DOM API | ⚠️ Skip | - | Use native DOM, not needed for Flutter.js |
| `package:http` | axios/node-fetch | ✅ Wrap | Few hours | Wrapping existing npm package |
| `package:dio` | axios | ✅ Wrap | Few hours | HTTP client wrapper |
| `package:provider` | Custom | ✅ Build | 2-3 days | State management, simple pattern |
| `package:intl` | date-fns/moment | ✅ Wrap | 1 day | Date formatting, number formatting |
| `package:uuid` | uuid | ✅ Wrap | Few hours | UUID generation |
| `package:firebase_core` | firebase npm | ✅ Wrap | 1-2 days | Firebase SDK wrapper |
| `package:firebase_auth` | firebase npm | ✅ Wrap | 1 day | Auth, uses firebase npm |
| `package:cloud_firestore` | firebase npm | ✅ Wrap | 2 days | Database, wrapping Firestore JS SDK |
| `package:google_maps_flutter` | Google Maps Web API | ✅ Use | Few hours | Use native Google Maps Web API |
| `package:image_picker` | `<input type="file">` | ✅ Build | 1-2 days | File input wrapper |
| `package:share_plus` | Web Share API | ✅ Wrap | Few hours | navigator.share() wrapper |
| `package:url_launcher` | `window.open()` | ✅ Wrap | Few hours | Open URLs, email, phone |
| `package:connectivity_plus` | navigator.onLine | ✅ Wrap | Few hours | Check connection status |
| `package:local_auth` | Web Authentication API | ⚠️ Limited | 1 day | Biometric not on web, keystore possible |
| `package:sqflite` | IndexedDB / sqlite.js | ✅ Wrap | 2-3 days | Client-side database |
| `package:shared_preferences` | localStorage | ✅ Wrap | Few hours | Simple key-value storage |
| `package:path` | path-browserify | ✅ Wrap | Few hours | Path manipulation |
| `package:rxdart` | RxJS | ✅ Wrap | 2 days | Reactive streams, map to RxJS |

---

## Implementation Phases

### Phase 1: Core Dart Standard Libraries (Weeks 1-2)

**Build these from scratch (only 4 packages, total 5 days):**
- `dart:core` (1-2 days)
- `dart:async` (2-3 days)
- `dart:convert` (1 day)
- `dart:math` (1 day)

**Result:** ~100KB of JavaScript compatibility layer

### Phase 2: Common Networking & I/O (Weeks 3-4)

**Wrap npm packages:**
- `dart:io` → axios/node-fetch (1-2 days)
- `package:http` → axios (Few hours)
- `package:dio` → axios (Few hours)

**Result:** Working HTTP client with Dart API

### Phase 3: Popular Third-Party Packages (Weeks 5-7)

**High-value wrappings:**
- `package:provider` → Custom impl (2-3 days)
- `package:intl` → date-fns (1 day)
- `package:firebase_core` → firebase npm (1-2 days)
- `package:uuid` → uuid npm (Few hours)
- `package:shared_preferences` → localStorage (Few hours)

**Result:** Coverage for 80% of popular Flutter apps

### Phase 4: Advanced Packages (Weeks 8-12)

**Complex but doable:**
- `package:cloud_firestore` → firestore.js (2 days)
- `package:sqflite` → IndexedDB (2-3 days)
- `package:image_picker` → file input (1-2 days)
- `package:rxdart` → RxJS (2 days)

**Result:** Advanced features working

### Phase 5: Integration & Testing (Weeks 13-16)

- Test real Flutter apps
- Handle edge cases
- Optimize bundle size
- Document unsupported APIs

---

## Smart Decisions: Wrap vs Build

### When to WRAP (preferred)

```
✅ Good candidates:
- JavaScript has native equivalent (Math, Date, Promise)
- NPM package exists and is mature (firebase, axios, uuid)
- Feature is 80%+ compatible with Dart version
- Can create thin adapter layer
- Time investment: <1 day per library

Example:
  Dart: jsonDecode() → JSON.parse()
  Wrap: export const jsonDecode = JSON.parse;
```

### When to BUILD (rare)

```
⚠️ Only build when:
- No JavaScript equivalent exists (Duration, Random with seed)
- Wrapping npm package would be bulky
- Dart has specific behavior JS doesn't (type safety features)
- Time investment: 1-3 days per library

Example:
  Dart: Duration class → Build custom class
  JS has: No Duration (just milliseconds)
  Solution: Build Duration class with inDays, inHours, etc. getters
```

### When to SKIP

```
❌ Skip these:
- Platform-specific (dart:io File I/O on web)
- Not applicable to web (dart:html - use native DOM)
- Have web alternatives (dart:io sockets → WebSocket)
- Custom Flutter features not needed (dart:mirrors)

If app tries to use skipped library:
→ Transpiler shows error: "This library is not supported on web"
→ Developer uses alternative package or npm library directly
```

---

## Bundle Size Strategy

### dart:core Compat Layer: ~8KB
- Collections wrapper
- DateTime + Duration
- Exception classes

### dart:async Compat Layer: ~5KB
- Future/Promise wrapper
- Stream with async generators
- Timer wrapper

### dart:convert Compat Layer: ~2KB
- JSON wrappers
- Base64, UTF8, Hex

### dart:math Compat Layer: ~1KB
- Math wrappers
- Random class

### dart:io Compat Layer: ~3KB
- HTTP wrapper
- Uri class
- WebSocket wrapper

**Total dart:* libraries: ~19KB** (minified + gzipped ~5KB)

### Third-Party Packages (npm):
- `axios`: ~15KB (already optimized, widely used)
- `firebase`: ~100KB (but tree-shakeable)
- `uuid`: ~2KB
- `date-fns`: ~10KB (modular, tree-shake to 3KB)
- `RxJS`: ~30KB (modular, tree-shake to 10KB)

**Smart approach:** Only include packages used in app (tree-shaking)

---

## The Implementation Template

For each library, follow this pattern:

```javascript
// @flutterjs/[library-name]/index.js

// 1. Import npm package (if wrapping)
import underlyingLibrary from 'npm-package';

// 2. Export Dart API
export class DartClassName {
  constructor(...) {
    // 3. Use underlying library
    this._impl = new underlyingLibrary(...);
  }
  
  // 4. Expose Dart methods
  dartMethod() {
    return this._impl.npmMethod();
  }
}

// 5. Export functions matching Dart API
export function dartFunction(...) {
  return underlyingLibrary.npmFunction(...);
}
```

**Examples:**

```javascript
// Wrapping (1-2 hours)
export const sqrt = Math.sqrt;
export const pow = Math.pow;
export async function get(url) {
  return await fetch(url);
}

// Building (1-3 days)
export class Duration {
  constructor({ days, hours, minutes, seconds, milliseconds }) {
    this.inMilliseconds = /* calculate */;
  }
}

// Hybrid (Few hours)
export class HttpClient {
  async get(uri) {
    const response = await fetch(uri);  // Use native
    return new Response(response);  // Wrap for Dart API
  }
}
```

---

## Success Metrics

You'll know you're done when:

✅ **Covered Core Libraries**
- Any Dart app compiles without "library not supported" errors

✅ **HTTP Works**
- `import 'package:http/http.dart'` ✓
- `http.get()`, `http.post()` ✓

✅ **JSON Works**
- `import 'dart:convert'` ✓
- `jsonDecode()`, `jsonEncode()` ✓

✅ **State Management Works**
- `import 'package:provider/provider.dart'` ✓
- Global state + listeners ✓

✅ **Async Works**
- `Future<T>` ✓
- `async/await` ✓
- `Stream<T>` ✓

✅ **Real App**
- Take existing Flutter app
- Transpile to JavaScript
- Runs without modification
- No `node-fetch` imports needed in user code

---

## Your Exact Strategy

1. **Parse Dart** → Extract imports and class definitions
2. **Check import map** → Do we have a wrapper for this?
3. **If yes, rewrite import** → `import 'package:http'` → `const http = require('@flutterjs/http')`
4. **If no, error** → Tell developer this package isn't supported yet
5. **Transpile code** → Dart syntax → JavaScript syntax
6. **Users never write `node-fetch`** → It's internal to our compatibility layer

Done. This is the complete strategy.