import 'dart:io';
import 'package:path/path.dart' as p;

/// Scaffolds new external package structure
///
/// Creates complete package directory with:
/// - Minimal Dart wrapper (~15 lines)
/// - JavaScript implementation
/// - Example Flutter app
/// - Build configurations
class PackageScaffold {
  /// Creates a new external package structure
  ///
  /// [packageName] - Name of the package (e.g., 'flutterjs_http')
  /// [outputDir] - Directory where package will be created (usually 'external_package')
  /// [description] - Package description
  /// [organization] - GitHub organization (default: 'flutterjs')
  Future<bool> createPackage({
    required String packageName,
    required String outputDir,
    String? description,
    String organization = 'flutterjs',
  }) async {
    try {
      // Validate package name
      if (!_isValidPackageName(packageName)) {
        print('❌ Invalid package name: $packageName');
        print('   Package names must be lowercase with underscores');
        return false;
      }

      final packageDir = p.join(outputDir, packageName);
      final packageDirectory = Directory(packageDir);

      // Check if package already exists
      if (await packageDirectory.exists()) {
        print('❌ Package already exists: $packageDir');
        return false;
      }

      print('📦 Creating external package: $packageName');
      print('   Location: $packageDir');

      // Create directory structure
      await _createDirectoryStructure(packageDir, packageName);

      // Generate all files
      await _generatePubspecYaml(
        packageDir,
        packageName,
        description,
        organization,
      );
      await _generateDartWrapper(packageDir, packageName, description);
      await _generatePackageJson(packageDir, packageName, description);
      await _generateJavaScriptImplementation(packageDir, packageName);
      await _generateExample(packageDir, packageName);
      await _generateGitignore(packageDir);
      await _generatePubignore(packageDir);
      await _generateReadme(packageDir, packageName, description, organization);
      await _generateChangelog(packageDir);
      await _generateLicense(packageDir);

      print('✅ Package created successfully!');
      print('');
      print('📁 Structure:');
      print('   $packageName/');
      print('   ├── lib/                    # Dart wrapper (pub.dev)');
      print('   ├── $packageName/           # JavaScript (npm)');
      print('   │   ├── package.json');
      print('   │   └── src/index.js');
      print('   ├── example/                # Flutter example');
      print('   └── README.md');
      print('');
      print('🚀 Next steps:');
      print('   1. cd $packageDir');
      print('   2. Implement JavaScript in $packageName/src/index.js');
      print('   3. Update example app');
      print('   4. Publish to npm: cd $packageName && npm publish');
      print('   5. Publish to pub.dev: dart pub publish');

      return true;
    } catch (e) {
      print('❌ Error creating package: $e');
      return false;
    }
  }

  bool _isValidPackageName(String name) {
    // Dart package name rules: lowercase, underscores, start with letter
    final regex = RegExp(r'^[a-z][a-z0-9_]*$');
    return regex.hasMatch(name);
  }

  Future<void> _createDirectoryStructure(
    String packageDir,
    String packageName,
  ) async {
    var directories = [
      p.join(packageDir, 'lib'),
      p.join(packageDir, packageName, 'src'),
      p.join(packageDir, 'example', 'lib'),
      p.join(packageDir, 'test'),
    ];

    for (final dir in directories) {
      await Directory(dir).create(recursive: true);
    }
  }

  Future<void> _generatePubspecYaml(
    String packageDir,
    String packageName,
    String? description,
    String organization,
  ) async {
    final file = File(p.join(packageDir, 'pubspec.yaml'));
    final content =
        '''
name: $packageName
version: 0.1.0
description: ${description ?? 'A FlutterJS package'}

homepage: https://github.com/$organization/$packageName
repository: https://github.com/$organization/$packageName
issue_tracker: https://github.com/$organization/$packageName/issues

environment:
  sdk: '>=2.19.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

# FlutterJS metadata
flutterjs:
  npm_package: "@flutterjs/$packageName"
  implementation_language: "javascript"
  js_entry: "js/src/index.js"
''';
    await file.writeAsString(content);
  }

  Future<void> _generateDartWrapper(
    String packageDir,
    String packageName,
    String? description,
  ) async {
    final file = File(p.join(packageDir, 'lib', '$packageName.dart'));
    final className = _toPascalCase(packageName);

    final content =
        '''
/// FlutterJS $className
/// 
/// ${description ?? 'A FlutterJS package'}
/// 
/// The actual implementation is in JavaScript.
/// This package is a metadata wrapper published to pub.dev.
/// 
/// ## Usage
/// 
/// Add to your `pubspec.yaml`:
/// ```yaml
/// dependencies:
///   $packageName: ^0.1.0
/// ```
/// 
/// Then run:
/// ```bash
/// flutterjs get
/// ```
/// 
/// The package will be installed to: `build/flutterjs/node_modules/@flutterjs/$packageName`
/// 
/// See `example/` for a complete working app.
library $packageName;

// The real implementation is in js/src/
''';
    await file.writeAsString(content);
  }

  Future<void> _generatePackageJson(
    String packageDir,
    String packageName,
    String? description,
  ) async {
    final file = File(p.join(packageDir, packageName, 'package.json'));
    final content =
        '''{
  "name": "@flutterjs/$packageName",
  "version": "0.1.0",
  "description": "${description ?? 'A FlutterJS package'}",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "test": "echo \\"No tests yet\\"",
    "prepublishOnly": "echo \\"Ready to publish\\""
  },
  "keywords": [
    "flutterjs",
    "$packageName"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/flutterjsdev/flutterjs.git"
  },
  "files": [
    "src/",
    "README.md",
    "LICENSE"
  ]
}
''';
    await file.writeAsString(content);
  }

  Future<void> _generateJavaScriptImplementation(
    String packageDir,
    String packageName,
  ) async {
    final file = File(p.join(packageDir, packageName, 'src', 'index.js'));
    final className = _toPascalCase(packageName);

    final content =
        '''
/**
 * FlutterJS $className
 * 
 * Simple, lightweight implementation built with JavaScript
 */

/**
 * Main class for $className
 */
export class $className {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Example method - replace with your implementation
   */
  hello() {
    return 'Hello from $className!';
  }

  /**
   * Example async method
   */
  async fetchData(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
}

/**
 * Helper function
 */
export function createInstance(config) {
  return new $className(config);
}

export default $className;
''';
    await file.writeAsString(content);
  }

  Future<void> _generateExample(String packageDir, String packageName) async {
    // Generate example pubspec.yaml
    final pubspecFile = File(p.join(packageDir, 'example', 'pubspec.yaml'));
    await pubspecFile.writeAsString('''
name: ${packageName}_example
description: Example app for $packageName

publish_to: 'none'

environment:
  sdk: '>=2.19.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter
''');

    // Generate example main.dart
    final mainFile = File(p.join(packageDir, 'example', 'lib', 'main.dart'));
    final className = _toPascalCase(packageName);

    await mainFile.writeAsString('''
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '$className Example',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const ExamplePage(),
    );
  }
}

class ExamplePage extends StatefulWidget {
  const ExamplePage({Key? key}) : super(key: key);

  @override
  State<ExamplePage> createState() => _ExamplePageState();
}

class _ExamplePageState extends State<ExamplePage> {
  String result = 'Click the button to test';

  void _testPackage() {
    setState(() {
      // This will call the JavaScript implementation when running with FlutterJS
      result = '$className is ready!\\n\\nRun: flutterjs run --to-js --serve';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('$className Example'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              result,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _testPackage,
              child: const Text('Test $className'),
            ),
          ],
        ),
      ),
    );
  }
}
''');
  }

  Future<void> _generateGitignore(String packageDir) async {
    final file = File(p.join(packageDir, '.gitignore'));
    await file.writeAsString('''
# Dependencies
node_modules/

# Build outputs
build/
dist/
.dev/
.debug/

# Generated files
.flutterjs/
.cache/

# Dart
.dart_tool/
.packages
pubspec.lock

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
''');
  }

  Future<void> _generatePubignore(String packageDir) async {
    final file = File(p.join(packageDir, '.pubignore'));
    await file.writeAsString('''
# Exclude JavaScript implementation from pub.dev
js/
node_modules/
dist/
build/
.git/
.github/
test/
package-lock.json
.vscode/
.idea/
''');
  }

  Future<void> _generateReadme(
    String packageDir,
    String packageName,
    String? description,
    String organization,
  ) async {
    final file = File(p.join(packageDir, 'README.md'));
    final className = _toPascalCase(packageName);

    await file.writeAsString('''
# $className

${description ?? 'A FlutterJS package'}

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  $packageName: ^0.1.0
```

Then run:

```bash
flutterjs get
```

## Usage

See `example/` for a complete Flutter app.

## JavaScript Implementation

The actual implementation is in `js/src/` (JavaScript).

To develop:

```bash
cd js
npm install
```

## Features

- Lightweight implementation
- SEO-friendly (FlutterJS rendering)
- Easy to use

## Publishing

### 1. Publish JavaScript to npm

```bash
cd js
npm publish
```

### 2. Publish Dart wrapper to pub.dev

```bash
dart pub publish
```

## License

MIT
''');
  }

  Future<void> _generateChangelog(String packageDir) async {
    final file = File(p.join(packageDir, 'CHANGELOG.md'));
    await file.writeAsString('''
## 0.1.0

* Initial release
''');
  }

  Future<void> _generateLicense(String packageDir) async {
    final file = File(p.join(packageDir, 'LICENSE'));
    await file.writeAsString('''
MIT License

Copyright (c) ${DateTime.now().year}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
''');
  }

  String _toPascalCase(String snakeCase) {
    return snakeCase
        .split('_')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join('');
  }
}
