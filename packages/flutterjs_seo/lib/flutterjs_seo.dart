library flutterjs_seo;

import 'package:flutter/widgets.dart';

/// A widget that manages SEO metadata (title and meta tags).
///
/// This widget doesn't render any visible UI itself but injects
/// the provided [title] and [meta] tags into the document head.
/// It renders its [child] widget.
class Seo extends StatefulWidget {
  final String? title;
  final Map<String, String>? meta;
  final Widget child;
  final bool debug;

  const Seo({
    Key? key,
    this.title,
    this.meta,
    required this.child,
    this.debug = false,
  }) : super(key: key);

  @override
  State<Seo> createState() => _SeoState();

  /// Imperatively update the document head.
  ///
  /// Use this for global updates or setting defaults before the app mounts.
  static void head({String? title, Map<String, String>? meta}) {
    // Maps to JS implementation static method
  }
}

class _SeoState extends State<Seo> {
  // Logic maps to JS
  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
