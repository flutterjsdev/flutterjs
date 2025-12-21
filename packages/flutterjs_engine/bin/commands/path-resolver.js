/**
 * Resolve file paths based on config
 * Handles both source (.fjs) and compiled (.js) paths
 */

import path from 'path';
import fs from 'fs';

export class PathResolver {
    constructor(projectRoot, config) {
        this.projectRoot = projectRoot;
        this.config = config;
        // ✅ Debug: Log what config we received
        if (process.env.DEBUG) {
            console.log('📁 PathResolver initialized:');
            console.log('  Config object keys:', Object.keys(config));
            console.log('  entry.main:', config.entry?.main);
            console.log('  build.source:', config.build?.source);
        }
    }

    /**
     * Get source file path (.fjs)
     * From config: entry.main = 'lib/main.fjs'
     * Returns: /full/path/to/project/lib/main.fjs
     */
    getSourcePath() {
        const entryFile = this.config.entry?.main || 'lib/main.fjs';
        const resolved = path.resolve(this.projectRoot, entryFile);

        // ✅ Debug output
        if (process.env.DEBUG) {
            console.log(`📍 getSourcePath():
        entryFile: ${entryFile}
        projectRoot: ${this.projectRoot}
        resolved: ${resolved}
        exists: ${fs.existsSync(resolved)}`);
        }

        return resolved;
    }

    /**
     * Get compiled file path (.js)
     * From config: entry.main = 'lib/main.fjs'
     * Returns: /full/path/to/project/dist/lib/main.js
     * (relative to output dir)
     */
    getCompiledPath(outputDir = 'dist') {
        const entryFile = this.config.entry?.main || 'lib/main.fjs';

        // Remove .fjs extension, add .js
        const jsFile = entryFile.replace(/\.fjs$/, '.js');

        return path.resolve(this.projectRoot, outputDir, jsFile);
    }

    /**
     * Get import path for app.js
     * For use in: import { MyApp } from './lib/main.js'
     * Returns: './lib/main.js' (relative to dist/)
     */
    getImportPath() {
        const entryFile = this.config.entry?.main || 'lib/main.fjs';

        // Remove .fjs, add .js
        const jsFile = entryFile.replace(/\.fjs$/, '.js');

        // Make relative (starts with ./)
        return './' + jsFile;
    }

    /**
     * Get output directory
     * From config or default
     */
    getOutputDir() {
        return this.config.build?.output || 'dist';
    }

    /**
     * Get source directory
     * From config or default
     */
    getSourceDir() {
        return this.config.build?.source || 'lib';
    }

    /**
     * Verify source file exists
     */
    sourceFileExists() {
        return fs.existsSync(this.getSourcePath());
    }

    /**
     * Get root widget name
     * From config: entry.rootWidget = 'MyApp'
     */
    getRootWidgetName() {
        return this.config.entry?.rootWidget || 'MyApp';
    }
}

export default PathResolver;