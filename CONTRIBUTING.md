# Contributing to FlutterJS

First off, thank you for considering contributing to FlutterJS! It's people like you that make FlutterJS such a great tool.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## ⚡ Quick Start

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/flutterjs.git
    cd flutterjs
    ```
3.  **Setup the environment**:
    ```bash
    # Get Dart dependencies
    dart pub get

    # Initialize project (installs JS dependencies for the engine)
    dart run tool/init.dart
    ```

## 🛠 Development Workflow

We use a monorepo structure. The core logic is in `packages/flutterjs_engine` (Node.js) and the CLI/Analyzer is in Dart packages.

### Running the Example App

To test your changes, use the counter example:

```bash
# Windows (PowerShell)
.\flutterjs.ps1 run --to-js --serve

# Linux/Mac
dart run bin/flutterjs.dart run --to-js --serve
```

### Rebuilding the Engine

If you modify files in `packages/flutterjs_engine`, you must rebuild the binary:

```bash
cd packages/flutterjs_engine
npm install
npm run build:windows  # or build:macos / build:linux
```

## 🐛 Reporting Bugs

Bugs are tracked as GitHub issues. Create an issue on that repository and provide the following information:

*   A quick summary and/or background.
*   Steps to reproduce. Be specific!
*   Sample code to help us reproduce the issue.
*   What you expected would happen.
*   What actually happened.
*   Notes (possibly including why you think this might be happening, or stuff you tried that didn't work).

## 💡 Suggesting Enhancements

Enhancement suggestions are tracked as [GitHub issues](https://github.com/flutterjsdev/flutterjs/issues). You can create an issue on that repository to:

*   Ask questions about the project.
*   Discuss the current state of the code.
*   Submit a bug report or feature request.

## 📥 Pull Request Process

1.  **Create a branch** from `master` (e.g., `feat/add-new-widget` or `fix/engine-crash`).
2.  **Make your changes**. Ensure you follow the coding style.
3.  **Run tests** (if applicable).
4.  **Update documentation** if you change functionality or add new features.
5.  **Push your branch** to your fork.
6.  **Open a Pull Request** against the `flutterjs` `master` branch.
7.  Reference any relevant issues in your PR description (e.g., "Fixes #123").

## 🎨 Coding Standards

*   **Dart**: We follow the standard [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style).
    *   Run `dart format .` before committing.
    *   Run `dart analyze` to check for lints.
*   **JavaScript**: We use standard ES6+ syntax.
    *   Ensure your code matches the existing style in `packages/flutterjs_engine`.

## 📜 License

By contributing, you agree that your contributions will be licensed under its BSD 3-Clause License.

## ❤️ Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
