# FlutterJS Project

This Flutter project is configured for FlutterJS transpilation.

## Architecture

FlutterJS generates **actual HTML/CSS/JS files** directly from your Flutter code.
There is NO bootloader - the output is standalone and deployable.

### Development Mode
```bash
flutterjs run
```

- Transpiles to: `build/flutterjs-cache/output/`
- Starts dev server at: `http://localhost:3000`
- Watches for file changes
- Incremental rebuilds (50-500ms typical)
- Browser refreshes automatically

### Production Build
```bash
flutterjs build
```

- Transpiles to: `build/web/`
- Minified and obfuscated
- Ready to deploy to any static host
- No server-side requirements

## File Structure

```
build/
├── flutterjs-cache/output/  # Dev builds (temporary)
│   ├── index.html           # Complete, standalone
│   ├── styles.css
│   └── app.js               # Only if stateful
│
└── web/                     # Production builds (deploy this!)
    ├── index.html           # Optimized, standalone
    ├── styles.css
    └── app.js
```

## Key Differences from Flutter Web

| Feature | Flutter Web | FlutterJS |
|---------|-------------|-----------|
| Output | Canvas + 2MB WASM | Semantic HTML/CSS |
| JS Required | Yes | Only if stateful |
| SEO | Poor | Excellent |
| Load Time | 5-15s | <2s |
| Bundle Size | 2+ MB | <50KB |

## How It Works

1. **Parse** your Flutter/Dart code
2. **Analyze** widget types and reactivity
3. **Transpile** to HTML/CSS/JS directly
4. **Write** standalone files (no bootloader)

### Widget Types

- **Stateless (no props)** → Pure HTML (no JS)
- **Stateless (with props)** → HTML + minimal JS
- **Stateful** → HTML + JS class + runtime
- **Functions** → Inlined into parent HTML

## Configuration

Edit `flutterjs.yaml` to customize:
- Output paths
- Dev server settings
- Optimization levels
- Transpiler behavior

## Deployment

Just deploy the `build/web/` directory to any static host:

```bash
# Netlify
netlify deploy --dir=build/web

# Vercel
vercel build/web

# Firebase
firebase deploy --only hosting

# GitHub Pages
# Just commit build/web to gh-pages branch
```

## Troubleshooting

### Changes not updating?
- Check console for transpilation errors
- Try: `flutterjs clean && flutterjs run`

### Port already in use?
- Edit `flutterjs.yaml` and change `dev.port`

### Output too large?
- Run production build: `flutterjs build`
- Check `build.production` settings in config

## Learn More

- [FlutterJS Documentation](https://github.com/your-repo)
- [Supported Widgets](https://github.com/your-repo/widgets.md)
- [Examples](https://github.com/your-repo/examples)
