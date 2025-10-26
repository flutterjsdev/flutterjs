# jay

A Flutter.js application.

## Getting Started

### 1. Transpile Flutter Code
First, transpile your Dart code to JavaScript:

```bash
flutter_js_compiler transpile src/
```

This will generate `.flutter_js/app.generated.js`

### 2. Start Development Server

```bash
flutter_js dev
```

Opens development server at http://localhost:3000

### 3. Build for Production

```bash
flutter_js build
```

Creates optimized build in `dist/` folder.

### 4. Preview Production Build

```bash
flutter_js preview
```

## Project Structure

```
jay/
├── flutter.config.js      # Configuration file
├── src/
│   └── main.dart         # Your Flutter/Dart code
├── assets/               # Images, fonts, etc.
├── .flutter_js/          # Generated files (gitignore this)
│   └── app.generated.js
├── dist/                 # Production build
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

Edit `flutter.config.js` to customize:
- Rendering mode (SSR/CSR/Hybrid)
- Build options
- Development server settings
- Optimization settings

## Learn More

- [Flutter.js Documentation](https://flutter-js.dev)
- [Flutter Documentation](https://flutter.dev)
