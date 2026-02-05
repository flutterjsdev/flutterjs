# Contributing to FlutterJS

Thank you for your interest in contributing to FlutterJS! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make FlutterJS better!

---

## How to Contribute

There are many ways to contribute:

1. **Report bugs** — Help us identify issues
2. **Suggest features** — Share your ideas
3. **Improve documentation** — Fix typos, clarify concepts
4. **Write code** — Implement features or fix bugs
5. **Test** — Try FlutterJS on different projects

---

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/flutterjs.git
cd flutterjs
```

### 2. Set Up Development Environment

**Prerequisites:**
- Dart SDK (2.17.0 or higher)
- Node.js (14 or higher)
- npm (6 or higher)
- Git

**Install dependencies:**

```bash
# Get Dart dependencies
dart pub get

# Initialize project (installs JS dependencies)
dart run tool/init.dart
```

### 3. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/issue-123
```

---

## Development Workflow

### Project Structure

```
flutterjs/
├── bin/                        # Dart CLI entry point
├── packages/
│   ├── flutterjs_analyzer/     # Dart analyzer
│   ├── flutterjs_engine/       # JavaScript runtime
│   └── flutterjs_tools/        # Build tools
├── examples/
│   ├── counter/                # Example apps
│   └── routing_app/
├── docs/                       # Documentation
└── tool/                       # Build scripts
```

### Running Examples

```bash
cd examples/counter
dart run ../../bin/flutterjs.dart run --to-js --serve
```

### Running Tests

```bash
# Dart tests
dart test

# JavaScript tests (if available)
cd packages/flutterjs_engine
npm test
```

---

## Making Changes

### Code Style

**Dart:**
- Follow [Dart style guide](https://dart.dev/guides/language/effective-dart/style)
- Run `dart format` before committing
- Use meaningful variable names

**JavaScript:**
- Use ES6+ features
- Prefer `const` over `let`
- Use arrow functions when appropriate
- Add JSDoc comments for public APIs

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add ListView.builder widget support"
git commit -m "Fix AppBar title rendering issue"
git commit -m "Update installation docs with troubleshooting"

# Bad
git commit -m "fix stuff"
git commit -m "update"
```

**Format:**
```
[Component] Brief description

Detailed explanation if needed.

Fixes #123
```

Examples:
- `[Widget] Add GridView widget`
- `[Analyzer] Fix type inference for generic classes`
- `[Docs] Update quick start guide`
- `[CLI] Add --watch flag for auto-rebuild`

---

## Pull Request Process

### 1. Update Your Branch

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Run Tests

```bash
dart test
dart analyze
```

### 3. Push Your Changes

```bash
git push origin feature/my-new-feature
```

### 4. Create Pull Request

- Go to GitHub and create a Pull Request
- Fill in the PR template
- Link related issues

**PR Template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Related Issues
Fixes #123

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Areas Needing Help

### High Priority

- **Widget Implementation** — More Material Design widgets
- **Package Support** — Enable use of Dart packages
- **Testing** — Unit and integration tests
- **Documentation** — More examples and guides

### Good First Issues

Look for issues labeled `good first issue` on [GitHub Issues](https://github.com/flutterjsdev/flutterjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

---

## Documentation Contributions

### Improving Docs

Documentation is in the `docs/` folder:

```
docs/
├── getting-started/
├── guides/
├── architecture/
├── examples/
└── README.md
```

**To contribute:**

1. Edit the relevant `.md` file
2. Preview locally (use any Markdown viewer)
3. Submit a PR

### Adding Examples

Create a new file in `docs/examples/`:

```markdown
# Example: Custom Widget

Description of what this example demonstrates.

## Code

[Show the code]

## Explanation

[Explain how it works]
```

---

## Bug Reports

### Before Reporting

1. Search [existing issues](https://github.com/flutterjsdev/flutterjs/issues)
2. Verify it's not a Dart syntax error
3. Check if it works in standard Flutter

### Report Template

```markdown
**Environment:**
- FlutterJS version: 
- Dart SDK version: 
- OS: 

**Description:**
Clear description of the bug.

**Steps to Reproduce:**
1. Step 1
2. Step 2

**Expected Behavior:**
What should happen.

**Actual Behavior:**
What actually happens.

**Code Sample:**
[Minimal code that reproduces the issue]

**Screenshots/Error Messages:**
[If applicable]
```

---

## Feature Requests

### Suggest a Feature

1. Check if it's [already requested](https://github.com/flutterjsdev/flutterjs/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Open a new issue with `enhancement` label
3. Describe the use case and proposed solution

---

## Release Process

**For Maintainers:**

1. Update version in `pubspec.yaml` and `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push --tags`
5. Publish to npm: `npm publish`

---

## Questions?

- Ask in [GitHub Discussions](https://github.com/flutterjsdev/flutterjs/discussions)
- Comment on related issues
- Join the community (Discord/Slack coming soon!)

---

Thank you for contributing to FlutterJS! 🎉
