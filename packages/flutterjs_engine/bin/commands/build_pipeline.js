/**
 * ============================================================================
 * FlutterJS Build Pipeline - SIMPLIFIED
 * ============================================================================
 * 
 * This is now a thin wrapper around BuildIntegration
 * All heavy lifting is done by BuildIntegration -> BuildAnalyzer -> BuildGenerator
 * 
 * Location: cli/build/build_pipeline.js
 */

import chalk from 'chalk';
import { BuildIntegration } from './build_integration.js';

class BuildResult {
  constructor() {
    this.success = false;
    this.outputDir = '';
    this.timestamp = new Date().toISOString();
    this.duration = 0;

    this.analysis = null;
    this.resolution = null;
    this.installation = null;
    this.collection = null;
    this.transformed = null;

    this.stats = {
      linesOfCode: 0,
      widgetsFound: 0,
      packagesResolved: 0,
      filesCollected: 0,
      importsRewritten: 0,
      transformationsApplied: 0,
      htmlSize: 0,
      bundleSize: 0
    };

    this.errors = [];
    this.warnings = [];
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

/**
 * ============================================================================
 * BuildPipeline - Main Entry Point
 * ============================================================================
 * 
 * Orchestrates the build using BuildIntegration
 * No duplication of logic
 */
class BuildPipeline {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      mode: config.mode || 'development',
      target: config.target || 'web',
      outputDir: config.outputDir || 'dist',
      debugMode: config.debugMode || false,
      installDependencies: config.installDependencies !== false,
      ...config
    };

    this.projectRoot = this.config.projectRoot;
    this.result = new BuildResult();
    
    // ✅ Use BuildIntegration for all work
    this.integration = new BuildIntegration(this.projectRoot, this.config);

    if (this.config.debugMode) {
      console.log(chalk.gray('[BuildPipeline] Initialized'));
      console.log(chalk.gray(`  projectRoot: ${this.projectRoot}`));
      console.log(chalk.gray(`  mode: ${this.config.mode}`));
      console.log(chalk.gray(`  output: ${this.config.outputDir}\n`));
    }
  }

  /**
   * ========================================================================
   * MAIN ENTRY POINT: Run the complete build
   * ========================================================================
   */
  async run() {
    const startTime = Date.now();

    try {
      // ✅ Let BuildIntegration do everything
      // It handles phases 1-10:
      // - Phase 1-7: Analysis (BuildAnalyzer)
      // - Phase 8-10: Generation (BuildGenerator)
      const integrationResult = await this.integration.execute();

      if (!integrationResult.success) {
        throw new Error('BuildIntegration failed');
      }

      // ✅ Copy results to our result object
      this.result.success = true;
      this.result.duration = Date.now() - startTime;
      this.result.outputDir = integrationResult.output?.outputDir || '';

      this.result.analysis = integrationResult.analysis;
      this.result.resolution = integrationResult.resolution;
      this.result.installation = integrationResult.installation;
      this.result.collection = integrationResult.collection;
      this.result.transformed = integrationResult.transformed;

      // Extract stats
      this.result.stats = {
        linesOfCode: integrationResult.analysis?.metadata?.linesOfCode || 0,
        widgetsFound: integrationResult.analysis?.widgets?.count || 0,
        packagesResolved: integrationResult.resolution?.packages.size || 0,
        filesCollected: integrationResult.collection?.copiedFiles.length || 0,
        importsRewritten: integrationResult.transformed?.importsRewritten || 0,
        transformationsApplied: integrationResult.transformed?.transformations || 0,
        htmlSize: 0,
        bundleSize: this.calculateBundleSize(integrationResult)
      };

      return this.result;

    } catch (error) {
      this.result.success = false;
      this.result.addError(`Build failed: ${error.message}`);
      if (this.config.debugMode) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Calculate total bundle size
   */
  calculateBundleSize(integrationResult) {
    try {
      let totalSize = 0;

      if (integrationResult.transformed?.transformedCode) {
        totalSize += Buffer.byteLength(
          integrationResult.transformed.transformedCode,
          'utf-8'
        );
      }

      if (integrationResult.output?.metadata) {
        totalSize += Buffer.byteLength(
          JSON.stringify(integrationResult.output.metadata),
          'utf-8'
        );
      }

      if (integrationResult.output?.registry) {
        totalSize += Buffer.byteLength(
          JSON.stringify(integrationResult.output.registry),
          'utf-8'
        );
      }

      if (integrationResult.collection?.totalSize) {
        totalSize += integrationResult.collection.totalSize;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get final report
   */
  getReport() {
    return {
      success: this.result.success,
      duration: this.result.duration,
      outputDir: this.result.outputDir,
      stats: this.result.stats,
      errors: this.result.errors,
      warnings: this.result.warnings
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { BuildPipeline, BuildResult };
export default BuildPipeline;