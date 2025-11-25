# FlutterJS Documentation Comment Guidelines

> **Goal:** Write comments that generate beautiful, professional API documentation automatically. Follow these rules to ensure your code is well-documented in FlutterJS Docs.

---

## Table of Contents

1. [Basic Structure](#basic-structure)
2. [Class Documentation](#class-documentation)
3. [Method Documentation](#method-documentation)
4. [Property Documentation](#property-documentation)
5. [Parameters & Return Values](#parameters--return-values)
6. [Code Examples](#code-examples)
7. [References & Links](#references--links)
8. [Formatting Rules](#formatting-rules)
9. [Common Patterns](#common-patterns)
10. [Do's and Don'ts](#dos-and-donts)

---

## Basic Structure

All documentation uses **Dart doc comments** (triple-slash `///`). Never use `//` or `/* */` for documentation.

### ✅ Correct
```dart
/// A button widget that follows Material 3 design.
class PrimaryButton extends StatelessWidget {
  // implementation
}
```

### ❌ Incorrect
```dart
// A button widget that follows Material 3 design.
class PrimaryButton extends StatelessWidget {
  // implementation
}

/* A button widget that follows Material 3 design. */
class PrimaryButton extends StatelessWidget {
  // implementation
}
```

---

## Class Documentation

### Format

```dart
/// Brief one-line description.
///
/// Detailed explanation (1-3 paragraphs) explaining:
/// - What the widget/class does
/// - When to use it
/// - Key behaviors and interactions
///
/// Use this for [SomeRelatedClass] when you need X.
///
/// The class automatically handles [state management/responsive sizing/etc].
///
/// {@tool snippet}
/// ```dart
/// MyClass(
///   property: value,
///   onTap: () => print('Tapped'),
/// )
/// ```
/// {@end-tool}
///
/// See also:
///  * [RelatedClass1], which does X.
///  * [RelatedClass2], for advanced usage.
///  * [GuidePage], a guide about this concept.
class MyClass extends StatelessWidget {
  // ...
}
```

### Example

```dart
/// A responsive button that follows Material 3 guidelines.
///
/// [PrimaryButton] is the most prominent button type, used for the primary
/// action on a screen such as "Submit", "Create", or "Continue". It features
/// a filled background using the primary color for maximum emphasis.
///
/// The button automatically adapts its padding, font size, and touch targets
/// based on the [size] parameter. It supports loading states, disabled states,
/// and full-width layouts.
///
/// {@tool snippet}
/// ```dart
/// PrimaryButton(
///   onPressed: () => _submitForm(),
///   child: Text('Submit'),
/// )
/// ```
/// {@end-tool}
///
/// For secondary actions, use [SecondaryButton]. For icon-only buttons, use
/// [IconButton].
///
/// See also:
///  * [SecondaryButton], for lower-emphasis actions.
///  * [Material3Guide], the official Material 3 specification.
class PrimaryButton extends StatelessWidget {
  // ...
}
```

---

## Method Documentation

### Format

```dart
/// Brief description of what the method does.
///
/// [Optional detailed description of behavior, edge cases, etc.]
///
/// Returns [description of return value or null if void].
///
/// Throws [ExceptionType] if [condition].
Future<String> fetchData({required String id}) async {
  // ...
}
```

### Examples

```dart
/// Builds the widget tree for this widget.
///
/// Called when the widget is first inserted into the widget tree and whenever
/// the widget's [state] changes. The [context] parameter provides access to
/// inherited widgets and theme data.
///
/// Returns a [Widget] that describes the UI.
@override
Widget build(BuildContext context) {
  // ...
}

/// Navigates to the specified route.
///
/// If [replace] is true, replaces the current route instead of pushing.
/// Returns a [Future] that resolves with the return value of the popped route.
///
/// Throws [RouteException] if the route name is not registered.
Future<T?> navigate<T>(
  String routeName, {
  Object? arguments,
  bool replace = false,
}) async {
  // ...
}

/// Disposes resources used by this widget.
///
/// Called when the widget is removed from the tree permanently.
/// Use this to cancel timers, close streams, or clean up connections.
@override
void dispose() {
  // ...
}
```

---

## Property Documentation

### Format - Public Properties

```dart
/// Brief description of what this property represents.
///
/// Defaults to [defaultValue]. Cannot be null if [isRequired] is true.
final String name;

/// The size of the button.
///
/// Determines padding, font size, and touch target. Defaults to [ButtonSize.medium].
/// Use [ButtonSize.small] for dense UIs and [ButtonSize.large] for accessibility.
final ButtonSize size;
```

### Format - Getters/Setters

```dart
/// Brief description.
///
/// This getter returns [description]. If not set explicitly, defaults to [value].
String get title => _title ?? 'Untitled';

/// Sets the title of the widget.
set title(String value) {
  _title = value;
  notifyListeners();
}
```

---

## Parameters & Return Values

### Parameter Comments

Document each parameter in the method's doc comment using a structured format:

```dart
/// Builds the user profile screen.
///
/// [userId] The unique identifier of the user. Must not be null.
/// [onNavigate] Callback fired when the user taps a related profile link.
///   Receives the related user's ID as a parameter.
/// [refreshInterval] Optional interval for auto-refreshing data in seconds.
///   Defaults to 30 seconds if not specified.
///
/// Returns the built widget.
Widget buildProfile(
  String userId, {
  required Function(String) onNavigate,
  Duration? refreshInterval,
}) {
  // ...
}
```

### Return Value Documentation

```dart
/// Processes the input data and returns the result.
///
/// Returns a [Map] with keys 'success' (bool) and 'data' (dynamic).
/// If processing fails, the 'success' key is false and 'data' contains
/// the error message.
Map<String, dynamic> processData(String input) {
  // ...
}
```

---

## Code Examples

### Inline Snippets

Use backticks for single-line code:

```dart
/// Use [setState] to trigger a rebuild with new data.
///
/// Call `setState(() { _counter++; })` to increment and rebuild.
```

### Multi-line Code Blocks

Use the `{@tool snippet}` directive for multi-line examples:

```dart
/// Creates a button with custom styling.
///
/// {@tool snippet}
/// ```dart
/// PrimaryButton(
///   onPressed: () => print('Clicked'),
///   size: ButtonSize.large,
///   child: Text('Click me'),
/// )
/// ```
/// {@end-tool}
```

### Complex Examples

For complex examples, create separate documentation pages:

```dart
/// Implements a custom theme system for the app.
///
/// For detailed usage examples, see the [ThemingGuide] documentation.
///
/// {@tool snippet}
/// ```dart
/// ThemeProvider(
///   theme: MyTheme(),
///   child: MyApp(),
/// )
/// ```
/// {@end-tool}
```

---

## References & Links

### Cross-References

Use square brackets `[ClassName]` to reference other classes, methods, properties, or guides:

```dart
/// A list view that uses [ItemBuilder] to create list items.
///
/// Similar to [ListView.builder], but with additional features like
/// automatic [caching] and [prefetch].
///
/// See [ItemBuilderGuide] for advanced usage patterns.
class SmartListView extends StatelessWidget {
  // ...
}
```

### Valid Reference Types

- **Classes**: `[MyClass]`
- **Methods**: `[myMethod]`
- **Properties**: `[myProperty]`
- **Enums**: `[MyEnum.value]`
- **External docs**: `[LinkText](https://example.com/page)`
- **Guides**: `[GuideName]` (auto-linked to guides/)

### Related Classes Section

Always include "See also" for related functionality:

```dart
/// See also:
///  * [SecondaryButton], for secondary actions.
///  * [IconButton], for icon-only buttons.
///  * [Material3ButtonGuide], for design specifications.
```

---

## Formatting Rules

### Emphasis & Style

```dart
/// Use **bold** for important concepts: **Material 3**, **Null Safety**.
///
/// Use *italic* for emphasis: *always* provide a fallback.
///
/// Use `code` for identifiers: the `onPressed` callback.
```

### Lists

```dart
/// This widget supports:
/// - [x] Null safety
/// - [x] Dark mode
/// - [x] Accessibility (WCAG 2.1)
///
/// Features to enable with [enable] flag:
/// 1. Animation
/// 2. Haptic feedback
/// 3. Sound effects
```

### Blockquotes

```dart
/// **Note:** This widget rebuilds on every theme change.
/// Consider using [Theme.of] caching for performance.
///
/// **Warning:** Do not call [setState] inside [build].
```

### Tables

```dart
/// Supported sizes:
///
/// | Size   | Padding         | Font Size |
/// |--------|-----------------|-----------|
/// | small  | 8px horizontal  | 12sp      |
/// | medium | 12px horizontal | 14sp      |
/// | large  | 16px horizontal | 16sp      |
```

---

## Common Patterns

### Widget Class

```dart
/// A customizable card that follows Material 3 design.
///
/// [Card] displays content in an elevated container with rounded corners
/// and a subtle shadow. Use it to group related information or create
/// distinct content sections.
///
/// {@tool snippet}
/// ```dart
/// Card(
///   child: Padding(
///     padding: EdgeInsets.all(16),
///     child: Column(
///       children: [
///         Text('Title'),
///         SizedBox(height: 8),
///         Text('Subtitle'),
///       ],
///     ),
///   ),
/// )
/// ```
/// {@end-tool}
///
/// See also:
///  * [Container], for basic layout.
///  * [Material], for raw material surfaces.
class Card extends StatelessWidget {
  /// Creates a material card.
  ///
  /// The [child] argument is required if [children] is not provided.
  const Card({
    Key? key,
    required this.child,
  }) : super(key: key);

  /// The widget below this widget in the tree.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // ...
  }
}
```

### Callback Type

```dart
/// Signature for callbacks when the button is pressed.
///
/// The [value] parameter is passed from the button's [onPressed] handler.
typedef OnButtonPressed = void Function(String value);
```

### Enum

```dart
/// Sizes for material buttons.
///
/// - [small]: Compact size for dense layouts (48x36dp)
/// - [medium]: Standard size for most use cases (48x40dp)
/// - [large]: Large size for accessibility (56x48dp)
enum ButtonSize {
  /// Compact size for dense layouts.
  small,
  
  /// Standard size for most use cases.
  medium,
  
  /// Large size for accessibility.
  large,
}
```

---

## Do's and Don'ts

### ✅ Do

- **Write clear, complete sentences** with proper grammar.
- **Use active voice**: "The button responds to taps" not "Taps will cause response".
- **Document all public APIs** without exception.
- **Include examples** for every non-trivial class or method.
- **Reference related classes** in "See also" sections.
- **Update docs when code changes** – docs are part of the contract.
- **Use proper Markdown** for formatting (bold, italic, code).
- **Explain the "why"**, not just the "what": Why should I use this over alternatives?
- **Document edge cases** and exceptions: "Returns null if X is not found."
- **Keep one-liners concise** (under 80 characters) for better readability.

### ❌ Don't

- **Repeat class names unnecessarily**: ❌ "PrimaryButton is a button" ✅ "A responsive button that..."
- **Write `@required` in comments** – use the `required` keyword in Dart.
- **Link to external sites** (except Material spec, official docs) – keep docs self-contained.
- **Use unclear abbreviations**: ❌ "Btn" ✅ "Button"
- **Forget to document all parameters** – even obvious ones need explanation.
- **Use TODO/FIXME comments** in public APIs – resolve before release.
- **Write in first person**: ❌ "I recommend using..." ✅ "Consider using..."
- **Include implementation details** in public docs – only document the contract.
- **Use HTML tags** – use Markdown instead.

---

## Generation Preview

When you run `flutterjs doc --output docs`, your comments are converted to HTML like this:

### Input (Dart)
```dart
/// A responsive button that follows Material 3 guidelines.
///
/// Use [PrimaryButton] for main actions, [SecondaryButton] for less important ones.
///
/// {@tool snippet}
/// ```dart
/// PrimaryButton(
///   onPressed: () => print('Clicked'),
///   child: Text('Submit'),
/// )
/// ```
/// {@end-tool}
///
/// See also:
///  * [SecondaryButton], a lower-emphasis button.
class PrimaryButton extends StatelessWidget {
  // ...
}
```

### Output (Generated HTML)

```html
<section class="md-section md-description">
  <h2>Description</h2>
  <p>A <strong>responsive button</strong> that follows <strong>Material 3</strong> guidelines.</p>
  <p>Use <a href="/api/widgets/PrimaryButton.html">PrimaryButton</a> for main actions, 
     <a href="/api/widgets/SecondaryButton.html">SecondaryButton</a> for less important ones.</p>
  
  <div class="md-example">
    <pre><code class="language-dart">PrimaryButton(
  onPressed: () => print('Clicked'),
  child: Text('Submit'),
)</code></pre>
  </div>
  
  <section class="md-see-also">
    <h3>See also</h3>
    <ul>
      <li><a href="/api/widgets/SecondaryButton.html">SecondaryButton</a>, a lower-emphasis button.</li>
    </ul>
  </section>
</section>
```

---

## Questions?

- Check existing classes in your codebase for style consistency
- Review [Material3 Design Docs](https://m3.material.io) for terminology
- Run `flutterjs doc --serve` to preview your docs locally with live reload
- Open an issue if the guidelines don't cover your use case

**Remember:** Good documentation is an investment in your library's adoption. Take time to write clear, helpful comments – your future users will thank you!