# PubJS - Technical Documentation

Technical documentation for the `pubjs` package.

---

## Documentation Index

### Core Concepts

- **[Package Resolution](resolution.md)** - How packages are resolved across Dart/JS
- **[Registry System](registry.md)** - Decentralized registry architecture
- **[Runtime Management](runtime-management.md)** - Browser-side package handling

---

## Architecture Details

### Dependency Flow

1. **Analysis**: `pubspec.yaml` is parsed to find dependencies.
2. **Resolution**: 
   - Check `pub.dev` for Dart metadata
   - Check internal registry for JS mapping
   - Check `npm` for JS implementation
3. **Download**: Assets are downloaded to the cache
4. **Linking**: Packages are linked for the runtime

### File Structure

```
pubjs/
├── lib/
│   ├── src/
│   │   ├── model/           # Data models (PackageInfo)
│   │   ├── registry_client.dart # Registry logic
│   │   ├── npm_client.dart      # NPM integration
│   │   ├── pub_dev_client.dart  # Pub.dev integration
│   │   ├── package_downloader.dart # Download logic
│   │   └── runtime_package_manager.dart # Runtime logic
│   └── pubjs.dart           # Main export
└── docs/                    # Technical docs
```

---

## Integration

### With Analyzer
The analyzer uses `pubjs` to resolve type definitions (from the Dart package) to help with static analysis.

### With CLI
The CLI uses `pubjs` to download and install packages when creating or building projects.

### With Code Gen
The code generator uses `pubjs` to know which runtime libraries to import in the generated JavaScript.

---

## Contributing

When adding support for a new package registry or modifying resolution logic, ensure comprehensive tests are added for both happy paths and network failure cases.

See [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md).
