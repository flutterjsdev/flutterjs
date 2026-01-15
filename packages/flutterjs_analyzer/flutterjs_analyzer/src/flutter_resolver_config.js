/**
 * Import Resolver Configuration
 * 
 * Define your custom package mappings and resolver settings here
 */

export const resolverConfig = {
  frameworkType: 'flutterjs',
  ignoreUnresolved: false,
  cacheEnabled: false,

  // ✅ CORRECTED: Specify exact locations for each package
  customPackageMappings: {
    // Under packages/flutterjs_engine/src/
    '@flutterjs/runtime': './flutterjs_engine/src/runtime',
    '@flutterjs/vdom': './flutterjs_engine/src/vdom',

    // Under packages/flutterjs_engine/package/
    '@flutterjs/material': './flutterjs_engine/package/material',
    '@flutterjs/http': './flutterjs_engine/package/http',

    // Add others as needed
    '@flutterjs/core': './flutterjs_engine/src/core',
    '@flutterjs/foundation': './flutterjs_engine/src/foundation',
    '@flutterjs/widgets': './flutterjs_engine/package/widgets',
  },

  // ✅ CORRECTED: Search paths
  localSearchPaths: [
    'packages/flutterjs_engine/src',           // runtime, vdom
    'packages/flutterjs_engine/package',       // material, http
    'src',
    'lib',
    'packages',
    'modules',
    'components',
    'screens',
    'widgets',
    '.',
  ],

  packageAliases: {
    'flutter': '@flutterjs/material',
    'material': '@flutterjs/material',
    'http': '@flutterjs/http',
  },

  strict: {
    enforceNamingConventions: false,
    requireVersions: false,
    detectCircularImports: true,
  },
};

/**
 * Create and configure resolver
 */
export function createResolver(options = {}) {
  const { ImportResolver } = import('./flutter_import_resolver.js');

  const resolver = new ImportResolver({
    projectRoot: process.cwd(),
    ...resolverConfig,
    ...options,
  });

  // Add all custom mappings
  if (resolverConfig.customPackageMappings) {
    resolver.addPackageMappings(resolverConfig.customPackageMappings);
  }

  // Set local search paths
  if (resolverConfig.localSearchPaths) {
    resolver.setLocalSearchPaths(resolverConfig.localSearchPaths);
  }

  return resolver;
}

/**
 * Preset configurations for different project types
 */
export const presets = {
  // Simple web app
  web: {
    localSearchPaths: ['src', 'lib', 'components', '.'],
    customPackageMappings: {},
  },

  // Monorepo structure
  monorepo: {
    localSearchPaths: [
      'packages/ui',
      'packages/core',
      'packages/models',
      'packages/utils',
      'src',
      '.',
    ],
    customPackageMappings: {
      '@package:ui': './packages/ui',
      '@package:core': './packages/core',
      '@package:models': './packages/models',
      '@package:utils': './packages/utils',
    },
  },

  // Flutter-style structure
  flutter: {
    localSearchPaths: [
      'lib',
      'lib/screens',
      'lib/widgets',
      'lib/models',
      'lib/services',
      'lib/utils',
      '.',
    ],
    customPackageMappings: {
      "@flutterjs/runtime": "file:../../../../runtime",
      "@flutterjs/vdom": "file:../../../../vdom",
      "@flutterjs/analyzer": "file:../../../../analyzer",
      '@flutterjs/material': 'file:../../../../../package/material',
    },
  },
};
