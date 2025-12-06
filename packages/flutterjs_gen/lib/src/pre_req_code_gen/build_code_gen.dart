// import 'dart:io';

// Future<void> createBuildStructure(bool verbose) async {
//   print('🏗️  Creating optimized build structure...');

//   final dirs = [

//     // Production output (final)
//     'build/flutterjs/output/pages',
//     'build/flutterjs/output/services',
//     'build/flutterjs/output/styles',
//     'build/flutterjs/js/framework', // ✅ NEW: Framework directory
//     // Reports
//     'build/flutterjs/reports',
//   ];

//   for (final dirPath in dirs) {
//     final dir = Directory(dirPath);
//     if (!await dir.exists()) {
//       await dir.create(recursive: true);
//       if (verbose) print('   Created: $dirPath/');
//     }
//   }

//   print('✅ Build structure created\n');
// }
