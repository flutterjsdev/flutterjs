# FlutterJS Package Override/Force Update Plan

## Overview

**Goal:** Allow users to force re-conversion of specific packages or all packages, bypassing the smart cache.

**Use Cases:**
- Package conversion failed/corrupted → Force reconvert
- FlutterJS converter improved → Update existing packages
- User suspects cache issue → Force refresh specific package
- Debug/development → Force clean rebuild

---

## Command Design

### Basic Usage

```bash
# Force reconvert ALL packages (ignore cache)
flutterjs pub get --override

# Force reconvert specific package
flutterjs pub get --override http

# Force reconvert multiple packages
flutterjs pub get --override http,provider,google_fonts

# Alias for convenience
flutterjs pub get --force
flutterjs pub get -f
```

### Advanced Usage

```bash
# Override with pattern matching
flutterjs pub get --override "url_launcher*"  # All url_launcher packages

# Override by category
flutterjs pub get --override --firebase       # All Firebase packages
flutterjs pub get --override --web-plugins    # All web plugins

# Dry run (show what would be reconverted)
flutterjs pub get --override http --dry-run

# Override with cache cleanup
flutterjs pub get --override --clean-cache

# Verbose output
flutterjs pub get --override http -v
```

---

## Implementation Plan

### Phase 1: Basic Override Functionality

#### 1.1 Command-Line Argument Parsing

**Add to CLI:**
```yaml
Arguments:
  --override [packages]     Force reconvert specified packages (or all if none specified)
  --force, -f              Alias for --override
  --dry-run                Show what would be reconverted without doing it
  --clean-cache            Remove cache before reconversion
```

**Parsing Logic:**
```
flutterjs pub get --override
  → Override all packages
  
flutterjs pub get --override http
  → Override only 'http' package
  
flutterjs pub get --override http,provider,google_fonts
  → Override 3 specific packages
  
flutterjs pub get --override "url_launcher*"
  → Override all packages matching pattern
```

#### 1.2 Override Detection

**Modify Package Update Plan:**

```
Current logic:
  For each package:
    if (cached && unchanged) → SKIP
    if (cached && changed) → CONVERT
    if (not cached) → CONVERT

New logic:
  For each package:
    if (--override flag && package in override list) → CONVERT (force)
    if (cached && unchanged) → SKIP
    if (cached && changed) → CONVERT
    if (not cached) → CONVERT
```

**Priority Order:**
1. Override flag (highest priority) → Always convert
2. Cache validation → Convert if changed
3. No cache → Convert

#### 1.3 Cache Invalidation

**When --override is used:**

```
Option A: Delete cache entry before conversion
  1. Remove package from cache index
  2. Delete .fjs files
  3. Proceed with conversion
  4. Write new cache entry

Option B: Mark cache entry as invalid
  1. Set cache.invalid = true
  2. Proceed with conversion
  3. Update cache entry
  
Recommendation: Option A (cleaner, prevents stale data)
```

---

### Phase 2: Pattern Matching

#### 2.1 Glob Pattern Support

**Pattern Examples:**
```bash
--override "http*"           # Matches: http, http_parser
--override "url_launcher*"   # Matches: url_launcher, url_launcher_web, etc.
--override "*_web"           # Matches: all _web packages
--override "*firebase*"      # Matches: any package with 'firebase' in name
```

**Implementation:**
- Use `glob` package or regex
- Match against resolved package list
- Expand patterns to specific package names

**Example Flow:**
```
User runs: flutterjs pub get --override "url_launcher*"

1. Resolve all packages: [http, url_launcher, url_launcher_web, provider, ...]
2. Apply pattern matching:
   - url_launcher ✓ (matches)
   - url_launcher_web ✓ (matches)
   - http ✗ (no match)
   - provider ✗ (no match)
3. Override list: [url_launcher, url_launcher_web]
4. Force convert these 2 packages
```

#### 2.2 Category-Based Override

**Predefined Categories:**

```yaml
categories:
  firebase:
    - firebase_core
    - firebase_auth
    - cloud_firestore
    - firebase_storage
    - firebase_analytics
    
  web_plugins:
    - url_launcher_web
    - path_provider_web
    - shared_preferences_web
    - package_info_plus_web
    
  state_management:
    - provider
    - riverpod
    - bloc
    - flutter_bloc
    
  ui_packages:
    - google_fonts
    - flutter_svg
    - cached_network_image
```

**Usage:**
```bash
flutterjs pub get --override --firebase
# Reconverts all Firebase packages

flutterjs pub get --override --web-plugins
# Reconverts all web plugin packages
```

---

### Phase 3: Advanced Features

#### 3.1 Dry Run Mode

**Purpose:** Show what would happen without actually doing it

**Output:**
```bash
$ flutterjs pub get --override http,provider --dry-run

Dry run mode - no changes will be made

Package update plan:
  ✓ Up-to-date: 20 packages
  ⟳ Would convert (override): 2 packages
     - http ^1.2.1
     - provider ^6.0.0
  
Total conversion time (estimated): ~8 seconds

Run without --dry-run to apply changes.
```

**Implementation:**
- Generate update plan as normal
- Print what would happen
- Exit without converting

#### 3.2 Cache Cleanup

**Purpose:** Remove all cached data before reconversion

**Usage:**
```bash
# Clean cache for specific package
flutterjs pub get --override http --clean-cache

# Clean entire cache
flutterjs pub get --override --clean-cache
```

**What Gets Cleaned:**
```
Specific package (http):
  .flutterjs_cache/packages/http-1.2.1/
  └─ Delete entire directory

All packages:
  .flutterjs_cache/
  ├─ packages/        ← Delete all
  └─ index.json       ← Regenerate
```

#### 3.3 Dependency Resolution

**Problem:** If you override one package, should dependents be reconverted?

**Example:**
```
http (override requested)
 └─ used by: google_fonts, url_launcher

Question: Should google_fonts and url_launcher be reconverted?
```

**Options:**

**Option A: Override Only Specified (Default)**
```bash
flutterjs pub get --override http
# Only reconverts http
# google_fonts and url_launcher use cached versions
```

**Option B: Override + Dependents**
```bash
flutterjs pub get --override http --with-dependents
# Reconverts http AND google_fonts AND url_launcher
```

**Option C: Smart Detection**
```bash
flutterjs pub get --override http
# If http's API changed → auto-reconvert dependents
# If only internal changes → keep dependents cached
```

**Recommendation:** Option A (default) + Option B (flag)

---

### Phase 4: User Experience

#### 4.1 Informative Output

**Before Conversion:**
```bash
$ flutterjs pub get --override http,provider

Resolving dependencies... ✓

Override mode enabled for 2 packages:
  • http ^1.2.1 (forced reconversion)
  • provider ^6.0.0 (forced reconversion)

Package update plan:
  ✓ Up-to-date: 20 packages
  ⟳ Converting (override): 2 packages
  
Proceeding with conversion...
```

**During Conversion:**
```bash
Converting packages (override mode)...
[████████████████████████████░░░░░░] 60% (3/5)

⟳ http (override)... ✓ (4.2s)
⟳ provider (override)... ✓ (3.8s)
```

**After Conversion:**
```bash
✓ Override conversion complete in 8.0s
  • 2 packages reconverted
  • 20 packages cached
  
Cache updated successfully.
```

#### 4.2 Error Handling

**Scenarios:**

**Unknown Package:**
```bash
$ flutterjs pub get --override unknown_package

Error: Package 'unknown_package' not found in dependencies.

Did you mean:
  • url_launcher
  • package_info_plus

Available packages:
  Run 'flutterjs pub list' to see all packages.
```

**Pattern Matches Nothing:**
```bash
$ flutterjs pub get --override "firebase*"

Warning: Pattern 'firebase*' matched 0 packages.

Available packages:
  http, provider, google_fonts, url_launcher...
  
No packages will be reconverted.
```

**Conversion Failure:**
```bash
$ flutterjs pub get --override http

⟳ Converting http... ✗ (failed)

Error: Conversion failed for package 'http'
  Reason: Unsupported Dart syntax in src/client.dart:42

Original cached version preserved.
Run with --verbose for details.
```

#### 4.3 Verbose Mode

**Standard Output:**
```bash
$ flutterjs pub get --override http

⟳ Converting http... ✓ (4.2s)
```

**Verbose Output (-v):**
```bash
$ flutterjs pub get --override http -v

⟳ Converting http...
  Analyzing package structure...
  Found 12 Dart files
  Parsing exports...
  Generating IR...
    - src/client.dart
    - src/request.dart
    - src/response.dart
  Converting to JavaScript...
  Writing output files...
    - .flutterjs_cache/packages/http-1.2.1/http.fjs
    - .flutterjs_cache/packages/http-1.2.1/http.fjs.map
  Updating cache index...
✓ (4.2s)
```

**Debug Output (--debug):**
```bash
$ flutterjs pub get --override http --debug

[DEBUG] Override mode: [http]
[DEBUG] Reading cache index: .flutterjs_cache/index.json
[DEBUG] Cache entry found for http@1.2.1
[DEBUG] Invalidating cache entry...
[DEBUG] Cache entry removed
[DEBUG] Starting conversion for http@1.2.1
[DEBUG] Package path: /Users/.../.pub-cache/hosted/pub.dev/http-1.2.1
[DEBUG] Analyzing package...
[DEBUG] Found exports: [Client, Request, Response, ...]
[DEBUG] Parsing src/client.dart...
[DEBUG] Generating IR node: ClassDeclaration(Client)
[DEBUG] Generating IR node: MethodDeclaration(get)
... (very detailed)
```

---

## Edge Cases & Handling

### Edge Case 1: Pre-Converted Packages

**Scenario:** User tries to override a pre-converted package

```bash
$ flutterjs pub get --override meta

Warning: Package 'meta' is pre-converted with FlutterJS.
  Pre-converted packages cannot be overridden.
  
If you believe the conversion is incorrect, please file an issue:
  https://github.com/flutterjs/flutterjs/issues
```

**Handling:**
- Show warning
- Skip override
- Provide feedback mechanism

### Edge Case 2: Override During First Run

**Scenario:** No cache exists yet

```bash
$ flutterjs pub get --override http
# (first run, no cache)

Info: No cache exists. All packages will be converted.
  The --override flag has no effect on first run.
  
Proceeding with initial conversion...
```

### Edge Case 3: Conflicting Flags

**Scenario:** User provides conflicting options

```bash
$ flutterjs pub get --override http --clean-cache

# Both flags specified - which takes precedence?

Solution: Combine them logically
  1. Clean cache for 'http'
  2. Reconvert 'http'
```

**Conflict Matrix:**

| Flag Combination | Behavior |
|-----------------|----------|
| `--override` + `--clean-cache` | Clean then convert |
| `--override` + `--dry-run` | Show plan without converting |
| `--override --force` | Redundant, use either |
| `--override` + `--with-dependents` | Override package + its dependents |

### Edge Case 4: Partially Cached Package

**Scenario:** Cache entry exists but .fjs files are missing

```bash
Current behavior (without --override):
  Detects missing files → Auto-reconverts

With --override:
  Same behavior, just explicit
```

**Handling:**
- Override flag is redundant in this case
- Show info message explaining auto-reconversion

---

## Implementation Checklist

### Phase 1: Basic Override (Week 1-2)

- [ ] Add `--override` flag to CLI argument parser
- [ ] Add `--force` and `-f` aliases
- [ ] Parse comma-separated package list
- [ ] Modify update plan logic to respect override
- [ ] Implement cache invalidation for overridden packages
- [ ] Test with single package override
- [ ] Test with multiple package override
- [ ] Test with all packages override (no args)

### Phase 2: Pattern Matching (Week 2-3)

- [ ] Add glob/regex pattern matching
- [ ] Support wildcards (*, ?)
- [ ] Expand patterns to package list
- [ ] Test various patterns
- [ ] Define category mappings
- [ ] Add category flags (--firebase, --web-plugins, etc.)
- [ ] Test category-based override

### Phase 3: Advanced Features (Week 3-4)

- [ ] Implement `--dry-run` mode
- [ ] Add `--clean-cache` option
- [ ] Implement `--with-dependents` flag
- [ ] Add dependency resolution logic
- [ ] Test all flag combinations
- [ ] Handle edge cases (pre-converted, first run, etc.)

### Phase 4: User Experience (Week 4)

- [ ] Design informative output messages
- [ ] Implement verbose mode (-v)
- [ ] Implement debug mode (--debug)
- [ ] Add error messages for common issues
- [ ] Add warnings for edge cases
- [ ] Write user documentation
- [ ] Create examples and tutorials

---

## Testing Plan

### Unit Tests

```yaml
Test: Override single package
  Given: Cache exists for 'http'
  When: Run 'flutterjs pub get --override http'
  Then: 
    - http is reconverted
    - Other packages are skipped
    - Cache is updated

Test: Override multiple packages
  Given: Cache exists for 'http' and 'provider'
  When: Run 'flutterjs pub get --override http,provider'
  Then:
    - http and provider are reconverted
    - Other packages are skipped
    
Test: Override all packages
  Given: Cache exists for all packages
  When: Run 'flutterjs pub get --override'
  Then: All packages are reconverted

Test: Pattern matching
  Given: Packages include 'url_launcher', 'url_launcher_web', 'http'
  When: Run 'flutterjs pub get --override "url_launcher*"'
  Then:
    - url_launcher reconverted
    - url_launcher_web reconverted
    - http skipped

Test: Dry run
  Given: Cache exists
  When: Run 'flutterjs pub get --override http --dry-run'
  Then:
    - Shows what would be reconverted
    - No actual conversion happens
    - Cache unchanged

Test: Unknown package
  Given: Package 'unknown' not in dependencies
  When: Run 'flutterjs pub get --override unknown'
  Then: Show error with suggestions
```

### Integration Tests

```yaml
Test: Full workflow with override
  1. Run 'flutterjs pub get' (first time)
  2. Verify cache created
  3. Run 'flutterjs pub get --override http'
  4. Verify only http reconverted
  5. Verify other packages cached
  
Test: Override with clean cache
  1. Run 'flutterjs pub get'
  2. Run 'flutterjs pub get --override http --clean-cache'
  3. Verify http cache deleted before reconversion
  4. Verify http reconverted successfully

Test: Override with dependents
  1. Run 'flutterjs pub get'
  2. Run 'flutterjs pub get --override http --with-dependents'
  3. Verify http reconverted
  4. Verify packages depending on http also reconverted
```

---

## Documentation

### User Guide

**Title:** Force Reconverting Packages

**Content:**
```markdown
## Override Mode

Sometimes you need to force FlutterJS to reconvert packages, even if they're cached:

### Force Reconvert All Packages

```bash
flutterjs pub get --override
```

This reconverts all packages, ignoring the cache.

### Force Reconvert Specific Packages

```bash
# Single package
flutterjs pub get --override http

# Multiple packages
flutterjs pub get --override http,provider,google_fonts

# Pattern matching
flutterjs pub get --override "url_launcher*"
```

### When to Use Override

- **Conversion failed:** Something went wrong, try again
- **FlutterJS updated:** New converter version available
- **Cache corrupted:** Suspect stale or corrupted cache
- **Debugging:** Testing conversion changes

### Advanced Options

```bash
# See what would be reconverted (without doing it)
flutterjs pub get --override http --dry-run

# Clean cache before reconverting
flutterjs pub get --override http --clean-cache

# Reconvert package and its dependents
flutterjs pub get --override http --with-dependents

# Verbose output
flutterjs pub get --override http -v
```

### Examples

**Example 1: Fixing a corrupted package**
```bash
$ flutterjs pub get --override google_fonts
```

**Example 2: Updating after FlutterJS upgrade**
```bash
$ flutterjs pub get --override
```

**Example 3: Testing a specific package**
```bash
$ flutterjs pub get --override http --dry-run
# See what would happen
$ flutterjs pub get --override http
# Actually do it
```
```

### CLI Help Text

```bash
$ flutterjs pub get --help

Usage: flutterjs pub get [options]

Get and convert packages from pub.dev

Options:
  --override [packages]     Force reconvert packages (comma-separated)
                            If no packages specified, reconverts all
  -f, --force              Alias for --override
  --dry-run                Show what would be done without doing it
  --clean-cache            Remove cache before reconverting
  --with-dependents        Also reconvert packages that depend on specified packages
  -v, --verbose            Show detailed output
  --debug                  Show debug information

Examples:
  flutterjs pub get --override                    # Reconvert all
  flutterjs pub get --override http               # Reconvert http only
  flutterjs pub get --override http,provider      # Reconvert multiple
  flutterjs pub get --override "url_launcher*"    # Pattern matching
  flutterjs pub get --override http --dry-run     # Preview changes
```

---

## Success Metrics

### Functional Metrics

- [ ] Override flag works for single package
- [ ] Override flag works for multiple packages
- [ ] Override flag works for all packages (no args)
- [ ] Pattern matching works correctly
- [ ] Category flags work correctly
- [ ] Dry run shows accurate plan
- [ ] Clean cache works correctly
- [ ] Dependents flag works correctly

### Performance Metrics

- [ ] Override doesn't significantly slow down conversion
- [ ] Cache invalidation is fast (< 100ms)
- [ ] Pattern matching is fast (< 500ms for 100 packages)

### User Experience Metrics

- [ ] Clear error messages for invalid packages
- [ ] Helpful warnings for edge cases
- [ ] Informative output during conversion
- [ ] Good documentation with examples

---

## Timeline

### Week 1: Basic Override
- Implement `--override` flag
- Support single and multiple packages
- Support "override all" (no packages specified)
- Test basic functionality

### Week 2: Pattern Matching
- Add glob pattern support
- Add category-based override
- Test pattern matching

### Week 3: Advanced Features
- Implement dry-run mode
- Add clean-cache option
- Add with-dependents flag
- Handle edge cases

### Week 4: Polish & Documentation
- Improve output messages
- Add verbose and debug modes
- Write user documentation
- Create examples

---

## Future Enhancements

### Version 1: Basic (Current Plan)
- Override specific packages
- Pattern matching
- Dry run
- Clean cache

### Version 2: Smart Override
- Detect when override is unnecessary
- Suggest packages that might need override
- Auto-override on FlutterJS version change

### Version 3: Selective Override
- Override only specific files within package
- Override only IR generation (skip parsing)
- Override only JS conversion (reuse IR)

### Version 4: Interactive Mode
```bash
$ flutterjs pub get --override --interactive

Select packages to reconvert:
  [ ] http
  [x] provider
  [ ] google_fonts
  [x] url_launcher

Press SPACE to select, ENTER to confirm.
```

---

**Last Updated:** January 30, 2026  
**Status:** Planning Complete → Ready for Implementation  
**Priority:** Medium (after core optimization)

---

*This feature will significantly improve developer experience when debugging package conversion issues!*
