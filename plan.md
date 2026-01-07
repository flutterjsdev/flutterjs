# FlutterJS Package Ecosystem & "PubJS" Plan

## Executive Summary
This document outlines the architectural roadmap for the **FlutterJS Package Management System**. Our goal is to replicate the robustness of the Flutter/Pub ecosystem in a JavaScript environment, allowing users to seamlessly use packages (e.g., `package:http`, `package:firebase`) that resolve to their correct FlutterJS implementations.

---

## 1. The Core Problem
Dart applications rely on `package:` imports. In FlutterJS, these imports must map to valid JavaScript modules (NPM packages or hosted JS files).
- **Dart**: `import 'package:google_fonts/google_fonts.dart';`
- **JS**: `import { GoogleFonts } from '@flutterjs/google_fonts';` (or similar)

We cannot hardcode these mappings. Users need a system to:
1.  **Define** dependencies (like `pubspec.yaml`).
2.  **Resolve** them to JS implementations.
3.  **Configure** custom mappings if needed.

---

## 2. Phase 1: Explicit Configuration (Implemented)
**Status**: ✅ Complete
The `flutterjs.config.json` file in the user's project root acts as the source of truth.

**Mechanism:**
- User adds `package:x` to `pubspec.yaml`.
- User maps `package:x` to `npm-package-y` in `flutterjs.config.json`.
- The **ImportResolver** (in `flutterjs_gen`) reads this map and generates correct JS imports.

```json
// flutterjs.config.json
{
  "packages": {
    "package:firebase_auth": "@flutterjs/firebase_auth",
    "package:http": "axios"
  }
}
```

---

## 3. Phase 2: The `flutterjs_pub` Package (New)
**Goal**: Automate the configuration. Users shouldn't manually edit JSON files.
We will create a new package: **`packages/flutterjs_pub`**.

### Responsibilities
1.  **Analyze `pubspec.yaml`**: Automatically detect dependencies.
2.  **Fetch Metadata**: Query a central registry ("PubJS") to find the corresponding JS package for a given Dart package.
    - *Example*: User has `http: ^1.0.0`. `flutterjs_pub` queries registry, finds it maps to `@flutterjs/http`, and updates `flutterjs.config.json`.
3.  **Auto-Configuration**: Run `flutterjs pub get` to generate the config file automatically.

### Architecture
- **CLI Command**: `dart run flutterjs_tool pub get`
- **Logic**: 
  - Read `pubspec.yaml`.
  - For each dependency, checks "PubJS Registry".
  - Writes resolution to `flutterjs.config.json`.

---

## 4. Phase 3: The "PubJS" Registry & CDN
**Goal**: A decentralized, Git-based distribution system.

### Concept
Instead of a heavy backend, we use a **Git Repository** as the registry.
- **Repo Structure**:
  ```
  /packages
    /http
      package.json (defines mapping: "package:http" -> "@flutterjs/http")
      /versions
        /1.0.0.js
    /firebase
      package.json
  ```

### Workflow
1.  **Publish**: Package authors push to the PubJS Git Repo.
2.  **Resolve**: The `flutterjs_pub` tool fetches the raw JSON from the Git repo (CDN style).
3.  **Security**: 
    - Verified Publishers (via Git signatures).
    - Compile-time Keys: Private packages can embed keys during the build process that are stripped from the final runtime code.

---

## 5. Implementation Roadmap

### Step 1: Create `flutterjs_config` (Standard)
- [x] Create `ConfigLoader` to read/write `flutterjs.config.json`.

### Step 2: Create `flutterjs_pub` (The Tool)
- [ ] Create `packages/flutterjs_pub`.
- [ ] Implement `PubSpecParser`.
- [ ] Implement `RegistryClient` (fetches mappings).
- [ ] Implement `ConfigGenerator` (updates `flutterjs.config.json`).

### Step 3: Integrate with Main CLI
- [ ] Add `flutterjs pub` command to the main tool.

---

## 6. User Experience
1.  **Create App**: `flutterjs create my_app`
2.  **Add Dependency**: Add `http: ^1.0.0` to `pubspec.yaml`.
3.  **Resolve**: Run `flutterjs pub get` (or it runs automatically).
    - *System*: Fetches mapping for `http`, writes to `flutterjs.config.json`.
4.  **Run**: `flutterjs run`
    - *System*: Generates `import ... from '@flutterjs/http'` automatically.

This is robust, strictly typed, and familiar to Flutter developers.
