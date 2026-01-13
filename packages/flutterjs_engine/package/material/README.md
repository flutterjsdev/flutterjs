# @flutterjs/material

The Material Design implementation for FlutterJS.

## Documentation

- **[Documentation Index](docs/README.md)**
- **[Component Guide](docs/component-guide.md)**
- **[Widget Status](docs/status.md)**

## Usage

```javascript
import { MaterialApp, Scaffold, AppBar, Text, Center } from '@flutterjs/material';

function MyApp() {
  return MaterialApp({
    title: 'My App',
    home: Scaffold({
      appBar: AppBar({ title: Text('Hello World') }),
      body: Center({ child: Text('Welcome!') })
    })
  });
}
```
