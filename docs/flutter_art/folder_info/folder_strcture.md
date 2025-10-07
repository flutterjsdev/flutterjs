# Flutter.js SDK Folder Structure

This document describes the recommended folder structure for the `flutter.js` SDK, inspired by the organization of the Flutter framework.

## Folder Structure Overview

```
flutterjs/
├── bin/         # Main entry points and executable files
├── dev/         # Plugin development (one plugin per folder)
├── packages/    # Mixed native and Dart code (core libraries, plugins)
├── example/     # Example projects demonstrating all possible use cases
└── templates/   # Predefined project and plugin structures
```

### Folder Details

- **bin/**  
    Contains the main entry point scripts and executable files for the SDK.

- **dev/**  
    Workspace for developing plugins. Each plugin should have its own subfolder.

- **packages/**  
    Houses packages that may include both native (platform-specific) and Dart code.

- **example/**  
    Contains example projects that showcase different features and use cases.

- **templates/**  
    Provides predefined structures (like project or plugin templates) for quick scaffolding.

---

## Example: Predefined Structure Template
---------------Blow code need to reanalayze --------------------------------------------------- 
You can create a template YAML file similar to Flutter's migration guides:

```yaml
version: 1
transforms:
    - title: "Remove 'backwardsCompatibility'"
        date: 2020-07-12
        element:
            uris: [ 'material.dart' ]
            constructor: ''
            inClass: 'AppBar'
        changes:
            - kind: 'removeParameter'
                name: 'backwardsCompatibility'
```

This format can be used to describe code transformations, migrations, or template changes within your SDK.

---

## Example: Fix Flutter AppBar

If you want to document a fix or migration (like removing a parameter from AppBar), use the above YAML structure in your `templates/` or documentation.

---

**Note:**  
This structure is flexible and can be extended as your SDK grows. Following this organization will help maintain clarity and scalability, similar to the official Flutter framework.
