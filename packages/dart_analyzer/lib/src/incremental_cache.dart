// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// // lib/src/analyzer/analysis_cache.dart

// import 'dart:io';
// import 'dart:convert';
// import 'dart:async';
// import 'package:path/path.dart' as path;

// /// Simple cache for analysis metadata (NOT IR)
// ///
// /// Caches:
// /// - File content hashes (for change detection)
// /// - File modification times (for quick filtering)
// /// - Analysis metadata
// ///
// /// Features:
// /// - Auto-save with debouncing
// /// - Atomic writes
// /// - Corruption recovery
// class AnalysisCache {
//   final String cacheDir;
//   final Map<String, String> _fileHashes = {};
//   final Map<String, int> _fileModTimes = {};
//   Map<String, dynamic> _metadata = {};

//   Timer? _saveTimer;
//   bool _isDirty = false;
//   bool _isDisposed = false;

//   AnalysisCache(this.cacheDir);

//   Future<void> initialize() async {
//     final dir = Directory(cacheDir);
//     if (!await dir.exists()) {
//       await dir.create(recursive: true);
//     }

//     await _loadHashIndex();
//     await _loadModTimeIndex();
//     await _loadMetadata();
//   }

//   // ==========================================================================
//   // HASH OPERATIONS
//   // ==========================================================================

//   Future<String?> getFileHash(String filePath) async {
//     return _fileHashes[filePath];
//   }

//   Future<void> setFileHash(String filePath, String hash) async {
//     if (_isDisposed) return;

//     _fileHashes[filePath] = hash;
//     _isDirty = true;
//     _scheduleSave();
//   }

//   // ==========================================================================
//   // MODIFICATION TIME OPERATIONS
//   // ==========================================================================

//   Future<int?> getFileModTime(String filePath) async {
//     return _fileModTimes[filePath];
//   }

//   Future<void> setFileModTime(String filePath, int modTime) async {
//     if (_isDisposed) return;

//     _fileModTimes[filePath] = modTime;
//     _isDirty = true;
//     _scheduleSave();
//   }

//   // ==========================================================================
//   // METADATA OPERATIONS
//   // ==========================================================================

//   Future<void> saveMetadata(Map<String, dynamic> metadata) async {
//     if (_isDisposed) return;

//     _metadata = Map.from(metadata);
//     await _saveMetadata();
//     // Also trigger save of other indices
//     await _forceSave();
//   }

//   Future<Map<String, dynamic>> getMetadata() async {
//     return Map.from(_metadata);
//   }

//   // ==========================================================================
//   // AUTO-SAVE WITH DEBOUNCING
//   // ==========================================================================

//   void _scheduleSave() {
//     if (_isDisposed) return;

//     _saveTimer?.cancel();
//     _saveTimer = Timer(Duration(seconds: 2), () async {
//       if (_isDirty) {
//         await _forceSave();
//       }
//     });
//   }

//   Future<void> _forceSave() async {
//     if (_isDisposed) return;

//     try {
//       await _saveHashIndex();
//       await _saveModTimeIndex();
//       _isDirty = false;
//     } catch (e) {
//       print('Warning: Failed to save cache: $e');
//     }
//   }

//   // ==========================================================================
//   // PERSISTENCE - HASH INDEX
//   // ==========================================================================

//   Future<void> _loadHashIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'hash_index.json'));
//       if (!await indexFile.exists()) return;

//       final content = await indexFile.readAsString();
//       final Map<String, dynamic> json = jsonDecode(content);

//       // Validate structure
//       if (json['version'] != 1) {
//         print('Warning: Incompatible cache version, rebuilding...');
//         return;
//       }

//       final hashes = json['hashes'] as Map<String, dynamic>?;
//       if (hashes != null) {
//         _fileHashes.addAll(hashes.cast<String, String>());
//       }

//       print('  Loaded ${_fileHashes.length} cached file hashes');
//     } catch (e) {
//       print('Warning: Failed to load hash index: $e');
//       // Don't fail, just start fresh
//     }
//   }

//   Future<void> _saveHashIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'hash_index.json'));
//       final tempFile = File('${indexFile.path}.tmp');

//       final data = {
//         'version': 1,
//         'timestamp': DateTime.now().toIso8601String(),
//         'count': _fileHashes.length,
//         'hashes': _fileHashes,
//       };

//       // Write to temp file first (atomic write)
//       final content = jsonEncode(data);
//       await tempFile.writeAsString(content);

//       // Rename temp to actual (atomic on most filesystems)
//       await tempFile.rename(indexFile.path);
//     } catch (e) {
//       print('Warning: Failed to save hash index: $e');
//     }
//   }

//   // ==========================================================================
//   // PERSISTENCE - MOD TIME INDEX
//   // ==========================================================================

//   Future<void> _loadModTimeIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'modtime_index.json'));
//       if (!await indexFile.exists()) return;

//       final content = await indexFile.readAsString();
//       final Map<String, dynamic> json = jsonDecode(content);

//       final modTimes = json['modTimes'] as Map<String, dynamic>?;
//       if (modTimes != null) {
//         for (final entry in modTimes.entries) {
//           _fileModTimes[entry.key] = entry.value as int;
//         }
//       }

//       print('  Loaded ${_fileModTimes.length} cached modification times');
//     } catch (e) {
//       print('Warning: Failed to load mod time index: $e');
//     }
//   }

//   Future<void> _saveModTimeIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'modtime_index.json'));
//       final tempFile = File('${indexFile.path}.tmp');

//       final data = {
//         'version': 1,
//         'timestamp': DateTime.now().toIso8601String(),
//         'count': _fileModTimes.length,
//         'modTimes': _fileModTimes,
//       };

//       final content = jsonEncode(data);
//       await tempFile.writeAsString(content);
//       await tempFile.rename(indexFile.path);
//     } catch (e) {
//       print('Warning: Failed to save mod time index: $e');
//     }
//   }

//   // ==========================================================================
//   // PERSISTENCE - METADATA
//   // ==========================================================================

//   Future<void> _loadMetadata() async {
//     try {
//       final metadataFile = File(path.join(cacheDir, 'metadata.json'));
//       if (!await metadataFile.exists()) return;

//       final content = await metadataFile.readAsString();
//       _metadata = jsonDecode(content) as Map<String, dynamic>;

//       print('  Loaded analysis metadata');
//     } catch (e) {
//       print('Warning: Failed to load metadata: $e');
//     }
//   }

//   Future<void> _saveMetadata() async {
//     try {
//       final metadataFile = File(path.join(cacheDir, 'metadata.json'));
//       final tempFile = File('${metadataFile.path}.tmp');

//       final content = jsonEncode(_metadata);
//       await tempFile.writeAsString(content);
//       await tempFile.rename(metadataFile.path);
//     } catch (e) {
//       print('Warning: Failed to save metadata: $e');
//     }
//   }

//   // ==========================================================================
//   // CACHE MANAGEMENT
//   // ==========================================================================

//   /// Clear all cached data
//   Future<void> clear() async {
//     _fileHashes.clear();
//     _fileModTimes.clear();
//     _metadata.clear();

//     try {
//       final dir = Directory(cacheDir);
//       if (await dir.exists()) {
//         await dir.delete(recursive: true);
//       }
//       await dir.create(recursive: true);
//     } catch (e) {
//       print('Warning: Failed to clear cache: $e');
//     }
//   }

//   /// Remove entries for files that no longer exist
//   Future<void> prune(Set<String> existingFiles) async {
//     final toRemove = <String>[];

//     for (final filePath in _fileHashes.keys) {
//       if (!existingFiles.contains(filePath)) {
//         toRemove.add(filePath);
//       }
//     }

//     for (final filePath in toRemove) {
//       _fileHashes.remove(filePath);
//       _fileModTimes.remove(filePath);
//     }

//     if (toRemove.isNotEmpty) {
//       print('  Pruned ${toRemove.length} stale cache entries');
//       _isDirty = true;
//       await _forceSave();
//     }
//   }

//   /// Get cache statistics
//   Map<String, dynamic> getStatistics() {
//     return {
//       'cachedFiles': _fileHashes.length,
//       'modTimeEntries': _fileModTimes.length,
//       'cacheSize': _estimateCacheSize(),
//       'isDirty': _isDirty,
//     };
//   }

//   int _estimateCacheSize() {
//     try {
//       int size = 0;
//       final dir = Directory(cacheDir);
//       if (dir.existsSync()) {
//         for (final file in dir.listSync(recursive: true)) {
//           if (file is File) {
//             size += file.lengthSync();
//           }
//         }
//       }
//       return size;
//     } catch (e) {
//       return 0;
//     }
//   }

//   // ==========================================================================
//   // CLEANUP
//   // ==========================================================================

//   Future<void> dispose() async {
//     _isDisposed = true;
//     _saveTimer?.cancel();

//     // Final save
//     if (_isDirty) {
//       await _forceSave();
//     }

//     _fileHashes.clear();
//     _fileModTimes.clear();
//     _metadata.clear();
//   }
// }
