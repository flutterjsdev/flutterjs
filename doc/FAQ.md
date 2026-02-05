# FAQ

Frequently asked questions about FlutterJS.

---

## General

### What is FlutterJS?

FlutterJS converts your Flutter/Dart code to semantic HTML + CSS + JavaScript, making your app SEO-friendly and lightweight compared to standard Flutter Web.

### How is FlutterJS different from Flutter Web?

| Feature | Flutter Web | FlutterJS |
|---------|-------------|-----------|
| Output | Canvas/WASM | HTML + CSS + JS |
| Bundle Size | 2-5 MB | ~50-100 KB |
| SEO | ❌ No | ✅ Yes |
| First Paint | 3-8s | <1s |
| Accessibility | Poor | Good |

### Is FlutterJS production-ready?

FlutterJS is in active development. Core widgets and features work well, but some advanced Flutter features are not yet supported. **Launching Jan 19-23, 2026** for public beta.

---

## Installation & Setup

### Do I need Flutter SDK installed?

You need the **Dart SDK** to run the FlutterJS Dart CLI. Full Flutter SDK is not required.

### What version of Node.js do I need?

Node.js 14 or higher. We recommend the latest LTS version.

### Can I use FlutterJS with existing Flutter projects?

Yes! As long as you're using supported widgets. Start with a simple example and gradually migrate.

---

## Development

### Which widgets are supported?

See the complete [Widget Catalog](guides/widget-catalog.md). Core widgets include:
- Layout: `Container`, `Row`, `Column`, `Stack`, `Padding`
- Material: `Scaffold`, `AppBar`, `ElevatedButton`, `Text`, `Icon`
- Navigation: `Navigator`, `MaterialPageRoute`

### Can I use Flutter packages?

Not yet. FlutterJS currently supports built-in widgets only. Package support is planned for future releases.

### Does hot reload work?

Incremental rebuilds work (the Dart CLI detects changes and rebuilds), but instant hot reload is planned for a future release.

### How do I debug my app?

Use browser DevTools to inspect HTML elements and JavaScript. Source maps are generated with `--sourcemap` flag.

---

## Features

### Does FlutterJS support animations?

Basic animations work, but advanced animations are not yet fully supported.

### Can I use custom fonts?

Yes! Add fonts to your project and reference them in `TextStyle`.

### Does it work with state management packages like Provider or Riverpod?

Not yet. Currently, only `setState()` and `InheritedWidget` are supported.

### Can I make HTTP requests?

Yes! The Dart `http` package is planned for support soon.

---

## Performance

### Why is my build slow?

First builds analyze all files. Subsequent builds use incremental compilation and are much faster.

### How can I reduce bundle size?

- Use `--js-optimization-level 3` for production
- Avoid importing unused widgets
- Minify your production build

### Does FlutterJS support SSR (Server-Side Rendering)?

Yes! FlutterJS supports CSR (Client-Side), SSR (Server-Side), and Hybrid rendering modes. See [Rendering Modes](guides/ssr-modes.md).

---

## Deployment

### Where can I deploy FlutterJS apps?

Any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Cloudflare Pages
- Any web server

### Do I need a Node.js server for deployment?

No! FlutterJS generates static HTML/CSS/JS files (for CSR mode). For SSR mode, you need a Node.js server.

### How do I deploy to production?

```bash
flutterjs build --mode csr --minify
# Upload dist/ folder to your hosting service
```

---

## SEO

### Will Google index my FlutterJS app?

Yes! FlutterJS renders semantic HTML that search engines can parse.

### Do I need to do anything special for SEO?

Use proper `Scaffold`, `AppBar` with `Text` for titles, and semantic HTML will be generated automatically.

### Can I customize meta tags?

Yes, modify the generated `public/index.html` to add custom meta tags, Open Graph tags, etc.

---

## Troubleshooting

### "Port 3000 is already in use"

Use a different port:
```bash
dart run bin/flutterjs.dart run --to-js --serve --server-port 4000
```

### "Failed to analyze lib/main.dart"

Check your Dart syntax:
```bash
dart analyze lib/main.dart
```

### My widget isn't rendering

1. Check if the widget is [supported](guides/widget-catalog.md)
2. Check browser console for errors
3. Verify your Dart code compiles: `dart analyze`

### Changes aren't showing up

Make sure you:
1. Saved the file
2. Re-ran the dev server or waited for incremental rebuild
3. Refreshed the browser

---

## Contributing

### How can I contribute?

See the [Contributing Guide](contributing/CONTRIBUTING.md) for details.

### Which features are most needed?

Check [GitHub Issues](https://github.com/flutterjsdev/flutterjs/issues) for feature requests and roadmap.

### I found a bug. Where do I report it?

[Open an issue](https://github.com/flutterjsdev/flutterjs/issues/new) on GitHub with:
- FlutterJS version
- Dart SDK version
- Steps to reproduce
- Expected vs actual behavior

---

## Licensing

### What license is FlutterJS under?

MIT License — free to use for commercial and personal projects.

### Can I use FlutterJS in commercial projects?

Yes! The MIT license allows commercial use.

---

## Support

### Where can I get help?

- [Documentation](README.md)
- [GitHub Discussions](https://github.com/flutterjsdev/flutterjs/discussions)
- [GitHub Issues](https://github.com/flutterjsdev/flutterjs/issues)

### Is there a Discord or Slack community?

Coming soon! Watch the [GitHub repository](https://github.com/flutterjsdev/flutterjs) for announcements.

---

## Future Plans

### What's on the roadmap?

- More widgets (GridView, Drawer, Dialog, etc.)
- Flutter package support
- Hot reload / HMR
- Animation support
- DevTools browser extension
- IPC mode for tighter CLI-Engine integration

See the [full roadmap](../README.md#roadmap) in the main README.

---

**Still have questions?**  
Ask in [Discussions](https://github.com/flutterjsdev/flutterjs/discussions)!
