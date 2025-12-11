# Strategic Plan: Building Dart-Compatible NPM Wrapper Ecosystem for FlutterJS

## Executive Summary

The core challenge is creating a **compatibility layer** that bridges JavaScript/NPM packages with Dart's API surface, enabling FlutterJS to seamlessly consume transpiled Dart code. This requires a systematic, phased approach that prioritizes foundational libraries, establishes robust wrapper patterns, and ensures long-term maintainability.

---

## Table of Contents

1. [Strategic Foundation & Philosophy](#1-strategic-foundation--philosophy)
2. [Library Categorization & Priority Matrix](#2-library-categorization--priority-matrix)
3. [NPM Package Discovery & Evaluation Framework](#3-npm-package-discovery--evaluation-framework)
4. [Wrapper Architecture Design](#4-wrapper-architecture-design)
5. [Implementation Methodology](#5-implementation-methodology)
6. [Quality Assurance & Testing Strategy](#6-quality-assurance--testing-strategy)
7. [Documentation & Developer Experience](#7-documentation--developer-experience)
8. [Maintenance & Evolution Strategy](#8-maintenance--evolution-strategy)
9. [Performance Optimization Techniques](#9-performance-optimization-techniques)
10. [Common Pitfalls & Risk Mitigation](#10-common-pitfalls--risk-mitigation)
11. [Phased Rollout Plan](#11-phased-rollout-plan)

---

## 1. Strategic Foundation & Philosophy

### 1.1 Core Principles

**API Fidelity Over Implementation**
- The wrapper's external API must match Dart exactly, even if internal implementation differs
- Prioritize developer ergonomics: Dart developers should feel at home
- Accept that some Dart features are impossible to replicate perfectly in JavaScript

**Layered Abstraction Strategy**
- Layer 1: Core primitives (types, collections, async)
- Layer 2: Standard utilities (math, strings, dates)
- Layer 3: I/O and platform services (HTTP, storage, filesystem)
- Layer 4: Framework-specific (Flutter widgets, material design)
- Build each layer only when previous layers are stable

**Progressive Enhancement Mindset**
- Start with minimal viable wrappers that handle 80% of use cases
- Enhance incrementally based on real usage patterns
- Don't aim for 100% Dart compatibility initially—focus on practical needs

### 1.2 Success Criteria Definition

**For Each Wrapper Library:**
- **Functional Completeness**: Covers most commonly used APIs (measured by Dart package popularity)
- **Type Safety**: Provides TypeScript definitions or JSDoc annotations matching Dart types
- **Performance Parity**: No more than 20% overhead compared to native NPM package
- **Documentation Quality**: Every public API documented with Dart-style examples
- **Test Coverage**: Minimum 80% for core libraries, 60% for extended libraries

### 1.3 Anti-Patterns to Avoid

**Over-Engineering Early**
- Don't create elaborate abstraction layers before understanding actual usage patterns
- Resist the urge to wrap every Dart feature—focus on what transpiled code actually uses
- Avoid creating custom implementations when solid NPM packages exist

**Tight Coupling to Specific NPM Versions**
- NPM packages update frequently; rigid version locks cause maintenance nightmares
- Design wrappers to be resilient to minor API changes in underlying packages
- Create adapter layers that isolate version-specific quirks

**Ignoring JavaScript Idioms**
- While API must match Dart, internal implementation should feel natural in JavaScript
- Don't fight JavaScript's event loop, prototype chain, or module system
- Leverage JavaScript strengths (closures, first-class functions, dynamic typing internally)

---

## 2. Library Categorization & Priority Matrix

### 2.1 Tier 1: Critical Foundation (Weeks 1-4)

**These are non-negotiable dependencies for basic code execution:**

**dart:core**
- **Why Critical**: Every Dart program imports this implicitly
- **Key Components**: 
  - Type system basics (Object, dynamic, Type)
  - Collections (List, Map, Set, Iterable)
  - Strings and string manipulation
  - Numbers (int, double, num)
  - Booleans, null handling
  - Exceptions (try/catch/finally)
- **NPM Candidates**: None needed—use native JavaScript primitives with wrappers
- **Wrapper Complexity**: High (requires significant API surface mapping)

**dart:async**
- **Why Critical**: Futures and Streams are fundamental to Dart's async model
- **Key Components**:
  - Future, FutureOr
  - Stream, StreamController
  - Completer
  - Timer, periodic timers
  - Zone (for error handling)
- **NPM Candidates**: None needed—map to Promises and async iterators
- **Wrapper Complexity**: High (async/await already compatible, but Streams need work)

**dart:math**
- **Why Critical**: Common in business logic and calculations
- **Key Components**:
  - Mathematical constants (pi, e, sqrt2)
  - Trigonometric functions
  - Random number generation
  - Min/max operations
  - Power, logarithmic functions
- **NPM Candidates**: 
  - `mathjs` for advanced functions
  - Native Math object for basics
- **Wrapper Complexity**: Low (mostly direct delegation)

### 2.2 Tier 2: Common Utilities (Weeks 5-8)

**dart:collection**
- **Why Important**: Advanced collection types for complex data structures
- **Key Components**:
  - LinkedHashMap, SplayTreeMap
  - Queue, LinkedList
  - HashMap with custom equality
  - UnmodifiableListView
- **NPM Candidates**:
  - `collections` (comprehensive data structures)
  - `immutable` for immutable collections
- **Wrapper Complexity**: Medium

**dart:convert**
- **Why Important**: JSON, UTF-8 encoding/decoding ubiquitous in apps
- **Key Components**:
  - jsonDecode, jsonEncode
  - utf8 codec
  - base64 encoding
  - LineSplitter
- **NPM Candidates**: Native JSON object, `buffer` for encoding
- **Wrapper Complexity**: Low

**dart:typed_data**
- **Why Important**: Binary data manipulation, file handling
- **Key Components**:
  - Uint8List, Int32List, Float64List
  - ByteData, ByteBuffer
  - Endianness handling
- **NPM Candidates**: Native TypedArray (Uint8Array, etc.)
- **Wrapper Complexity**: Low (mostly aliasing)

### 2.3 Tier 3: I/O and Platform Services (Weeks 9-12)

**dart:io** (Server/CLI context only)
- **Why Important**: File I/O, HTTP servers, sockets
- **Key Components**:
  - File, Directory operations
  - HttpServer, HttpClient
  - Socket, WebSocket
  - Process spawning
- **NPM Candidates**:
  - Node.js native `fs`, `http`, `net` modules
  - `node-fetch` for HTTP client
- **Wrapper Complexity**: Medium
- **Note**: Browser context uses different APIs (fetch, File API)

**package:http**
- **Why Important**: Standard Dart HTTP client package
- **Key Components**:
  - Client, Request, Response
  - Multipart requests
  - Streaming responses
- **NPM Candidates**:
  - `axios` (feature-rich, interceptors)
  - `node-fetch` (lightweight, standards-compliant)
  - Browser `fetch` API
- **Wrapper Complexity**: Medium

**dart:html** (Browser only)
- **Why Important**: DOM manipulation, browser APIs
- **Key Components**:
  - Element, Document, Window
  - Event handling
  - Canvas, WebGL
  - Local storage
- **NPM Candidates**: Native browser APIs
- **Wrapper Complexity**: High (large API surface)

### 2.4 Tier 4: Framework-Specific (Weeks 13-16)

**Flutter Core Widgets**
- Already addressed in main architecture plan
- Depends on all Tier 1-2 libraries being complete

**Material/Cupertino Libraries**
- Theme system integration
- Platform-specific widget behaviors
- Depends on complete widget rendering pipeline

### 2.5 Tier 5: Optional/Advanced (Future phases)

**dart:isolate**
- Web Workers or Node.js worker threads
- Complex, low priority initially

**dart:mirrors**
- Reflection capabilities
- Very difficult in JavaScript (no compile-time reflection)
- May skip entirely or provide limited subset

**dart:ffi**
- Native code interop
- Not applicable in JavaScript context

---

## 3. NPM Package Discovery & Evaluation Framework

### 3.1 Package Selection Criteria

**Mandatory Requirements:**
1. **Active Maintenance**: Last commit within 6 months
2. **Popularity Threshold**: 
   - Core libraries: >500K weekly downloads OR well-established (e.g., lodash)
   - Utility libraries: >100K weekly downloads
   - Niche libraries: >10K weekly downloads with strong GitHub stars
3. **License Compatibility**: MIT, Apache 2.0, BSD (avoid GPL/LGPL)
4. **TypeScript Support**: Either written in TypeScript or has @types definitions
5. **Stability**: Version 1.0+ or extensive production usage

**Evaluation Scoring System:**

For each candidate package, score (1-5) on:
- **API Similarity to Dart**: How closely does its API match Dart's?
- **Performance**: Benchmark results compared to alternatives
- **Bundle Size**: Impact on final application size (critical for web)
- **Dependencies**: Fewer is better (less supply chain risk)
- **Community Health**: Issue response time, PR acceptance rate
- **Documentation**: Quality and completeness

**Disqualification Criteria:**
- No updates in 12+ months (unless proven stable, like `lodash`)
- Open critical security vulnerabilities
- Incompatible with target JavaScript environments (ES6+ required)
- Excessive bundle size (>50KB minified for utility libraries)

### 3.2 Discovery Process

**Step 1: Identify Dart API Surface**
- For each Dart library, extract complete public API
- Categorize by usage frequency (analyze popular Dart packages for patterns)
- Identify must-have vs. nice-to-have features

**Step 2: NPM Search Strategy**
- Use npmjs.com, GitHub, npms.io for package discovery
- Search terms: "[functionality] javascript", "[dart equivalent]"
- Check "awesome" lists (awesome-javascript, awesome-nodejs)
- Consult JavaScript framework ecosystems (React, Vue, Node.js)

**Step 3: Comparative Analysis**
- Create feature matrix: Dart API vs. NPM package capabilities
- Identify gaps: features Dart has but NPM package lacks
- Identify extras: features NPM package has beyond Dart (leverage?)
- Estimate wrapper complexity based on API mismatch

**Step 4: Proof-of-Concept Testing**
- Build minimal wrapper for top 3 candidates
- Run basic functionality tests
- Measure performance and bundle size
- Evaluate developer experience (how easy to wrap?)

### 3.3 Package Mapping Examples

**For dart:core Collections:**

| Dart Class | NPM Candidate | Rationale |
|------------|---------------|-----------|
| List<T> | Native Array | Zero overhead, familiar |
| Map<K,V> | Native Map | ES6 Map matches Dart semantics better than Object |
| Set<T> | Native Set | Direct mapping |
| Iterable<T> | Native iterators | Protocol-level compatibility |
| LinkedHashMap | `collections/linked-hash-map` | Maintains insertion order |

**For dart:async:**

| Dart Class | NPM/Native | Rationale |
|------------|------------|-----------|
| Future<T> | Native Promise | Already compatible with async/await |
| Stream<T> | Custom (no perfect match) | Closest: RxJS Observable, but too heavy |
| Completer<T> | Custom Promise wrapper | Simple to implement |
| Timer | Native setTimeout/setInterval | Direct mapping |

**For dart:math:**

| Dart API | NPM Candidate | Rationale |
|----------|---------------|-----------|
| Basic functions | Native Math | Already available |
| Random | Native Math.random + wrapper | Simple implementation |
| Advanced math | `mathjs` | Comprehensive, well-maintained |

**For package:http:**

| Dart API | NPM Candidate | Rationale |
|----------|---------------|-----------|
| Client | `axios` (Node/browser) | Interceptors, timeout, wide adoption |
| Request/Response | `axios` types | Good type definitions |
| Streaming | `node-fetch` + streams | Better stream support |

### 3.4 Decision Documentation Template

For each library, document:

```
Library: dart:X
Target NPM Package: package-name@version
Decision Date: YYYY-MM-DD

Rationale:
- Why this package over alternatives
- Feature coverage: X% of Dart API
- Performance characteristics
- Bundle size impact: X KB

Alternatives Considered:
1. package-a: Reason for rejection
2. package-b: Reason for rejection

Known Limitations:
- Feature X not supported
- Workaround: ...

Maintenance Plan:
- Version lock strategy
- Update frequency
- Breaking change handling
```

---

## 4. Wrapper Architecture Design

### 4.1 Core Wrapper Patterns

**Pattern 1: Transparent Delegation (Low Impedance)**
- Use when NPM API closely matches Dart API
- Wrapper is thin pass-through with minimal transformation
- Example: `dart:math` wrapping native Math object

```
Characteristics:
- 1:1 method mapping
- Minimal argument transformation
- Direct return value pass-through
- Zero or near-zero performance overhead
```

**Pattern 2: Adapter/Facade (Medium Impedance)**
- Use when APIs differ but concepts align
- Wrapper translates between different calling conventions
- Example: Dart Future<T> wrapping JavaScript Promise<T>

```
Characteristics:
- Method name/signature translation
- Argument restructuring
- Return value transformation
- Modest performance overhead
```

**Pattern 3: Emulation (High Impedance)**
- Use when no suitable NPM package exists
- Implement Dart semantics from scratch in JavaScript
- Example: Dart Stream<T> (no direct JavaScript equivalent)

```
Characteristics:
- Custom implementation
- May use multiple NPM packages as building blocks
- Significant performance considerations
- Most maintenance burden
```

**Pattern 4: Hybrid (Multi-Backend)**
- Provide different implementations for different environments
- Example: HTTP client (browser fetch vs. Node.js http)

```
Characteristics:
- Environment detection
- Multiple backend implementations
- Unified API surface
- Conditional loading/bundling
```

### 4.2 Module Organization Structure

**Recommended Directory Layout:**

```
@flutterjs/
├── core/                         # dart:core wrapper
│   ├── src/
│   │   ├── types.js             # Object, Type, dynamic
│   │   ├── collections/
│   │   │   ├── list.js          # List<T> wrapper
│   │   │   ├── map.js           # Map<K,V> wrapper
│   │   │   ├── set.js           # Set<T> wrapper
│   │   │   └── iterable.js      # Iterable<T> base
│   │   ├── string.js            # String extensions
│   │   ├── numbers.js           # int, double, num
│   │   └── exceptions.js        # Exception hierarchy
│   ├── index.js                 # Public exports
│   ├── package.json
│   └── README.md
│
├── async/                        # dart:async wrapper
│   ├── src/
│   │   ├── future.js            # Future<T> = Promise<T>
│   │   ├── stream.js            # Stream<T> implementation
│   │   ├── completer.js         # Completer<T>
│   │   ├── timer.js             # Timer wrapper
│   │   └── zone.js              # Zone implementation
│   ├── index.js
│   └── package.json
│
├── math/                         # dart:math wrapper
│   ├── src/
│   │   ├── constants.js         # pi, e, etc.
│   │   ├── functions.js         # sin, cos, sqrt, etc.
│   │   └── random.js            # Random class
│   ├── index.js
│   └── package.json
│
├── convert/                      # dart:convert wrapper
├── collection/                   # dart:collection wrapper
├── typed-data/                   # dart:typed_data wrapper
├── http/                         # package:http wrapper
└── ...

Each package:
- Independent npm package (@flutterjs/core, @flutterjs/async, etc.)
- Own version number (semantic versioning)
- Own dependencies (minimizes bloat)
- Can be used independently or as part of full FlutterJS
```

### 4.3 API Design Principles

**Principle 1: Exact API Matching**
- Method names, parameters, return types must match Dart documentation exactly
- Even if implementation is wildly different internally
- Example: `List.sort()` should accept optional `Comparator<T>` just like Dart

**Principle 2: Type Safety Through JSDoc or TypeScript**
- Provide rich type definitions for tooling support
- Use generics where Dart does (List<T>, Map<K,V>, Future<T>)
- Document type constraints (e.g., `T extends Comparable`)

**Principle 3: Fail-Fast on Unsupported Features**
- Don't silently ignore unsupported Dart features
- Throw clear error: `NotImplementedError: dart:core num.clamp not yet supported`
- Provide guidance: "Consider using Math.min(Math.max(value, min), max) instead"

**Principle 4: Performance Pragmatism**
- Don't sacrifice massive performance for minor API fidelity
- Document deviations: "Note: This implementation is O(n) vs. Dart's O(1) due to JavaScript limitations"
- Provide performance tips in documentation

**Principle 5: Interoperability Affordances**
- Make it easy to escape hatch to native JavaScript when needed
- Provide `.toNative()` or `.raw` accessors for underlying NPM objects
- Allow passing native JavaScript types where sensible

### 4.4 Error Handling Strategy

**Dart Exception Hierarchy in JavaScript:**

```
Create exception classes matching Dart's hierarchy:
- Exception (base)
  - FormatException
  - IntegerDivisionByZeroException
  - ...
- Error (base)
  - ArgumentError
  - RangeError
  - StateError
  - TypeError
  - UnsupportedError
  - ...
```

**Error Translation:**
- Catch underlying NPM package errors
- Translate to appropriate Dart exception type
- Preserve stack traces when possible
- Add context about which Dart API was called

**Validation:**
- Validate arguments match Dart's type constraints
- Throw ArgumentError for invalid input
- Throw RangeError for out-of-bounds access
- Throw StateError for illegal state transitions

### 4.5 Configuration and Customization

**Environment Detection:**
- Automatically detect browser vs. Node.js
- Load appropriate backend implementations
- Gracefully degrade when features unavailable (e.g., no Worker threads)

**Configuration Options:**
- Allow developers to override default NPM package choices
- Example: Use `node-fetch` instead of `axios` for HTTP
- Provide plugin mechanism for custom implementations

**Polyfill Strategy:**
- Include polyfills for older JavaScript environments only when needed
- Use feature detection, not browser sniffing
- Document minimum supported JavaScript version (recommend ES6+)

---

## 5. Implementation Methodology

### 5.1 Development Workflow

**Phase-Based Implementation:**

**Phase 1: API Surface Definition**
1. Extract complete Dart API from official documentation
2. Create TypeScript/JSDoc interface definitions
3. Document each method with Dart-style comments
4. Generate API compatibility checklist

**Phase 2: Minimal Viable Wrapper (MVW)**
1. Implement only most commonly used methods (80/20 rule)
2. Stub out remaining methods with `throw NotImplementedError`
3. Write basic unit tests for implemented methods
4. Validate with real transpiled code from test files

**Phase 3: Incremental Enhancement**
1. Implement additional methods based on usage analytics
2. Expand test coverage
3. Performance optimization pass
4. Documentation improvements

**Phase 4: Stabilization**
1. Comprehensive integration testing
2. Edge case handling
3. Performance benchmarking
4. API freeze (semantic versioning)

### 5.2 Test-Driven Development Approach

**Test Suite Structure:**

```
tests/
├── unit/
│   ├── list.test.js          # Test List<T> wrapper
│   ├── map.test.js           # Test Map<K,V> wrapper
│   └── ...
├── integration/
│   ├── async-flow.test.js    # Test Future + Stream together
│   └── ...
├── compatibility/
│   ├── dart-parity.test.js   # Tests from Dart SDK
│   └── ...
└── performance/
    ├── benchmarks.js
    └── ...
```

**Dart Parity Tests:**
- Port tests directly from Dart SDK where possible
- Ensures behavioral compatibility
- Example: Port `list_test.dart` to JavaScript, run against wrapper

**Performance Benchmarks:**
- Measure overhead vs. native JavaScript
- Measure overhead vs. native NPM package
- Set performance budgets (e.g., <20% overhead for core operations)

### 5.3 Code Generation Opportunities

**Generate Boilerplate:**
- Use code generation for repetitive delegation patterns
- Input: Dart API specification (parsed from docs or AST)
- Output: JavaScript wrapper skeletons

**Example Generator:**
```
Input: dart:core List API specification
Output: 
- list.js with method stubs
- list.d.ts with TypeScript definitions
- list.test.js with test stubs
- list.md with documentation template
```

**Benefits:**
- Ensures consistency across wrappers
- Reduces human error
- Speeds up initial development
- Easier to update when Dart API changes

### 5.4 Dependency Management

**Version Locking Strategy:**

**For Tier 1 Libraries (core, async, math):**
- Lock to specific versions of underlying NPM packages
- Only update after thorough testing
- Document compatibility matrix

**For Tier 2-3 Libraries:**
- Use semver ranges (^1.0.0) for more flexibility
- Regularly test against latest versions
- Have CI/CD pipeline catch breaking changes

**Dependency Auditing:**
- Run `npm audit` regularly
- Monitor security advisories for all dependencies
- Have plan for rapid security patching

**Bundle Size Monitoring:**
- Track bundle size for each wrapper package
- Set size budgets (e.g., @flutterjs/core < 20KB minified+gzipped)
- Use tools like `bundlephobia` in CI

---

## 6. Quality Assurance & Testing Strategy

### 6.1 Multi-Level Testing Pyramid

**Level 1: Unit Tests (Foundation)**
- Test each wrapper method in isolation
- Mock underlying NPM packages
- Fast execution (<100ms per test)
- Target: 80%+ coverage for Tier 1, 60%+ for others

**Level 2: Integration Tests**
- Test multiple wrappers working together
- Use real NPM packages (not mocks)
- Example: Future + Stream + Timer integration
- Target: Cover all common usage patterns

**Level 3: Compatibility Tests**
- Port Dart SDK tests where feasible
- Ensures behavioral parity with Dart
- Run continuously against new Dart versions
- Target: Pass 90%+ of portable Dart tests

**Level 4: End-to-End Tests**
- Test wrappers with real transpiled FlutterJS applications
- Use test.fjs and main.fjs as test fixtures
- Validates entire pipeline (analyzer → runtime → wrappers)
- Target: All sample apps work correctly

**Level 5: Performance Tests**
- Benchmark critical paths (List operations, async flows)
- Compare against native JavaScript equivalents
- Detect performance regressions
- Target: Stay within defined performance budgets

### 6.2 Cross-Environment Testing

**Test Matrix:**

| Environment | Node.js | Browser | Framework |
|-------------|---------|---------|-----------|
| Node 18 LTS | ✓ | - | - |
| Node 20 Latest | ✓ | - | - |
| Chrome Latest | - | ✓ | FlutterJS |
| Firefox Latest | - | ✓ | FlutterJS |
| Safari Latest | - | ✓ | FlutterJS |
| Edge Latest | - | ✓ | FlutterJS |

**Environment-Specific Issues:**
- Node.js: Test dart:io wrappers (file I/O, HTTP server)
- Browser: Test dart:html wrappers (DOM manipulation)
- Mobile browsers: Performance and bundle size constraints

### 6.3 Continuous Integration Setup

**CI Pipeline Stages:**

1. **Lint & Format**
   - ESLint for code quality
   - Prettier for formatting
   - JSDoc validation

2. **Unit Tests**
   - Run all unit tests
   - Generate coverage report
   - Fail if coverage drops below threshold

3. **Integration Tests**
   - Run with real dependencies
   - Test against multiple Node.js versions

4. **Build & Bundle**
   - Build all packages
   - Generate bundles
   - Check bundle sizes

5. **E2E Tests**
   - Run against sample apps
   - Test in browser environments (headless)

6. **Performance Tests**
   - Run benchmarks
   - Compare against baselines
   - Alert on regressions

7. **Publish (if tagged release)**
   - Publish to npm
   - Generate changelog
   - Update documentation

### 6.4 Manual Testing Guidelines

**For Each Release:**
- Test all sample applications manually in browser
- Verify documentation examples work
- Check error messages are helpful
- Test developer experience (install, import, usage)
- Validate TypeScript definitions in VS Code

---

## 7. Documentation & Developer Experience

### 7.1 Documentation Structure

**Per-Package Documentation:**

```
@flutterjs/core/
├── README.md                    # Overview, installation, quick start
├── docs/
│   ├── api/                     # Full API reference (auto-generated)
│   │   ├── List.md
│   │   ├── Map.md
│   │   └── ...
│   ├── guides/
│   │   ├── collections.md       # How to use collections
│   │   ├── type-system.md       # Understanding Dart types in JS
│   │   └── migration.md         # Migrating from native JS
│   └── examples/
│       ├── basic-list.js
│       ├── custom-sort.js
│       └── ...
└── CHANGELOG.md
```

**Central Documentation Site:**
- docs.flutterjs.com (or similar)
- Unified search across all packages
- Side-by-side Dart vs. FlutterJS examples
- Interactive playground (run code in browser)

### 7.2 API Documentation Standards

**For Each Method:**

```
Example documentation template:

/**
 * Sorts this list according to the order specified by the compare function.
 * 
 * This is a Dart-compatible wrapper for JavaScript's Array.sort().
 * 
 * @template T
 * @param {(a: T, b: T) => number} [compare] - Optional comparator function
 * @returns {void}
 * 
 * @example
 * // Dart example
 * var list = [3, 1, 2];
 * list.sort();
 * print(list); // [1, 2, 3]
 * 
 * @example
 * // FlutterJS equivalent
 * const list = new List([3, 1, 2]);
 * list.sort();
 * console.log(list.toString()); // [1, 2, 3]
 * 
 * @see https://api.dart.dev/stable/dart-core/List/sort.html
 * @throws {UnsupportedError} If list is not modifiable
 */
sort(compare) {
  // Implementation
}
```

**Include:**
- Clear description matching Dart docs
- Type annotations (JSDoc or TypeScript)
- Dart example (from official docs)
- FlutterJS equivalent example
- Link to official Dart documentation
- Exceptions that may be thrown
- Performance characteristics if relevant

### 7.3 Migration Guides

**From Dart to FlutterJS:**
- Highlight API differences
- Explain JavaScript limitations
- Provide workarounds for unsupported features
- Common gotchas (e.g., integer division)

**From Native JavaScript to FlutterJS:**
- Why use FlutterJS wrappers vs. native JS?
- Performance comparison
- Interoperability tips
- When to use which

### 7.4 Developer Tooling

**IDE Support:**
- TypeScript definitions for autocomplete
- JSDoc for inline documentation
- VS Code snippets for common patterns
- ESLint plugin for FlutterJS best practices

**CLI Tools:**
- `flutterjs doctor` - Check environment and dependencies
- `flutterjs create-package` - Scaffold new wrapper package
- `flutterjs test` - Run tests across all packages
- `flutterjs benchmark` - Run performance benchmarks

**DevTools Integration:**
- Inspector for Dart objects in browser console
- Performance profiling specific to FlutterJS runtime
- Network inspector for http package

---

## 8. Maintenance & Evolution Strategy

### 8.1 Version Management

**Semantic Versioning:**
- MAJOR: Breaking API changes (incompatible with previous Dart version)
- MINOR: New features (new Dart APIs added)
- PATCH: Bug fixes, performance improvements

**Release Cadence:**
- Patch releases: As needed (bug fixes, security)
- Minor releases: Monthly (new features, improvements)
- Major releases: Quarterly or when Dart has breaking changes

**Compatibility Promise:**
- Each FlutterJS version targets specific Dart SDK version
- Example: FlutterJS 1.x → Dart 3.0, FlutterJS 2.x → Dart 3.1
- Document compatibility matrix clearly

### 8.2 Keeping Up with Dart Evolution

**Monitoring Strategy:**
- Subscribe to Dart SDK release notes
- Watch dart-lang/sdk GitHub repo
- Participate in Dart community discussions

**Update Process:**
1. New Dart version released
2. Analyze changelogs for API changes
3. Prioritize changes by impact (breaking vs. additive)
4. Update wrapper implementations
5. Update tests
6. Update documentation
7. Release new minor/major version

**Deprecation Handling:**
- If Dart deprecates API, mark wrapper as deprecated
- Provide migration path in documentation
- Remove in next major version

### 8.3 Community Contributions

**Contribution Guidelines:**
- CONTRIBUTING.md in each package
- Code style guide (use Prettier)
- Test requirements (add tests for new features)
- Documentation requirements (update docs for API changes)

**Package Ownership:**
- Assign maintainers to each wrapper package
- Clear escalation path for issues
- Regular maintainer meetings

**Issue Triage:**
- Use labels: bug, enhancement, help-wanted, good-first-issue
- Prioritize based on impact and Dart alignment
- Fast-track security issues

### 8.4 Monitoring and Analytics

**Usage Analytics (Optional, Opt-in):**
- Track which wrapper APIs are most used
- Identify unused features (candidates for deprecation)
- Understand performance in real applications

**Error Tracking:**
- Integrate with error tracking services (Sentry, etc.)
- Monitor NotImplementedError exceptions
- Track breaking changes impact

**Performance Monitoring:**
- Collect performance metrics from real applications
- Identify bottlenecks
- Guide optimization efforts

---

## 9. Performance Optimization Techniques

### 9.1 Minimize Wrapper Overhead

**Lazy Initialization:**
- Don't initialize wrapper internals until first use
- Example: List wrapper only wraps native array when needed

**Prototype Sharing:**
- Share method implementations across instances
- Use JavaScript's prototype chain effectively

**Inline Critical Paths:**
- For hot paths (e.g., List.add), inline implementation
- Avoid extra function calls when possible

**Memoization:**
- Cache expensive computations (e.g., hashCode)
- Clear cache on mutations

### 9.2 Bundle Size Optimization

**Tree-Shaking Friendly:**
- Use ES modules for all packages
- Avoid side effects in module initialization
- Mark side-effect-free code with `/*#__PURE__*/` comments

**Code Splitting:**
- Split large wrappers (e.g., dart:html) into sub-packages
- Allow importing only needed parts
- Example: `@flutterjs/html/dom`, `@flutterjs/html/canvas`

**Dependency Optimization:**
- Prefer smaller NPM packages
- Consider implementing simple functionality instead of large dependency
- Example: Basic