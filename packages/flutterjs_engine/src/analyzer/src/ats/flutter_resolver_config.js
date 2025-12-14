/**
 * Import Resolver Configuration
 * 
 * Define your custom package mappings and resolver settings here
 */

export const resolverConfig = {
  // Framework type
  frameworkType: 'flutter-js',

  // Project root (usually process.cwd())
  // projectRoot: '/path/to/project',

  // Fail on unresolved imports?
  ignoreUnresolved: false,

  // Enable package cache checking (future feature)
  cacheEnabled: false,

  // Custom package mappings (@package:xyz -> actual path)
  customPackageMappings: {
    '@package:ui': './packages/ui',
    '@package:models': './packages/models',
    '@package:utils': './packages/utils',
    '@package:services': './packages/services',
    '@package:theme': './packages/theme',
    '@package:constants': './packages/constants',
  },

  // Local search paths (where to look for local imports)
  // Order matters - first match wins
  localSearchPaths: [
    'src',
    'lib',
    'packages',
    'modules',
    'components',
    'screens',
    'widgets',
    '.',
  ],

  // Package aliases (alternatives to @package:)
  packageAliases: {
    'flutter': '@package:flutter',
    'material': '@package:material',
    'cupertino': '@package:cupertino',
  },

  // Strict mode options
  strict: {
    // Fail if import doesn't match expected pattern
    enforceNamingConventions: false,

    // Require explicit versions
    requireVersions: false,

    // Warn about circular imports
    detectCircularImports: true,
  },
};

/**
 * Create and configure resolver
 */
export function createResolver(options = {}){
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
      '@package:flutter': 'flutter-js-framework/core',
      '@package:material': 'flutter-js-framework/material',
      '@package:ui': './lib/widgets',
      '@package:models': './lib/models',
      '@package:services': './lib/services',
      '@package:utils': './lib/utils',
    },
  },
};
