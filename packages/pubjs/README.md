# PubJS

**Package**: `pubjs`  
**Purpose**: Decentralized package manager for FlutterJS

---

## Overview

`pubjs` is the package management engine for FlutterJS. It bridges the gap between the Dart `pub` ecosystem and the JavaScript `npm` ecosystem, allowing FlutterJS to resolve and use packages from both worlds.

**Key Features:**
- **Decentralized Registry**: resolves packages via Git-based registry
- **Hybrid Resolution**: Supports both `pub.dev` (Dart) and `npm` (JS) packages
- **Runtime Management**: Manages runtime dependencies for the browser
- **Scaffolding**: Generates package templates

---

## Architecture

`pubjs` acts as a middleware that resolves dependencies defined in `pubspec.yaml` to their appropriate JavaScript implementations.

```
FlutterJS Project
     ↓
pubspec.yaml
     ↓
┌──────────────────────┐
│        PubJS         │
│                      │
│  [Pub.dev Client]    │ ←── Fetches Dart metadata
│  [NPM Client]        │ ←── Fetches JS implementations
│  [Registry Client]   │ ←── Resolves mappings
│                      │
└──────────┬───────────┘
           ↓
    Resolved Packages
   (ready for browser)
```

---

## Core Components

### Registry Client
Resolves standard Dart packages to their FlutterJS-compatible JavaScript implementations.

### Package Downloader
Downloads and caches package assets.

### Runtime Package Manager
Manages the lifecycle of packages in the runtime environment, ensuring correct loading order and dependency resolution.

### Clients
- **PubDevClient**: Interacts with the official Dart package repository.
- **NpmClient**: Interacts with the Node Package Manager repository.

---

## Usage

This package is primarily used by `flutterjs_tools` (the CLI) and `flutterjs_analyzer` to handle dependency resolution.

```dart
import 'package:pubjs/pubjs.dart';

// Initialize manager
final manager = RuntimePackageManager();

// Resolve dependencies
await manager.resolve(packageConfig);

// Download package
final downloader = PackageDownloader();
await downloader.download(packageId);
```

---

## See Also

- [FlutterJS Tools](../flutterjs_tools/README.md) - CLI that uses PubJS
- [FlutterJS Analyzer](../flutterjs_analyzer/README.md) - Analyzer that uses PubJS
- [Contributing Guide](../../docs/contributing/CONTRIBUTING.md)
