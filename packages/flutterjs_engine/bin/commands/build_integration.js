/**
 * ============================================================================
 * BuildIntegration - Build Pipeline Orchestrator
 * ============================================================================
 *
 * Coordinates the complete build pipeline:
 * - Analysis (Phases 1-7) via BuildAnalyzer
 * - Generation (Phases 8-10) via BuildGenerator
 * 
 * This is the main entry point that orchestrates the full build.
 */

import chalk from "chalk";
import { BuildAnalyzer } from "./build_integration_analyzer.js";
import { BuildGenerator } from "./build_integration_generator.js";

class BuildIntegration {
  constructor(projectRoot, config = {}) {
    this.projectRoot = projectRoot;
    this.config = {
      mode: config.mode || "development",
      target: config.target || "web",
      outputDir: config.outputDir || "dist",
      debugMode: config.debugMode || false,
      installDependencies: config.installDependencies !== false,
      ...config,
    };

    // Initialize sub-components
    this.analyzer = new BuildAnalyzer(this);
    this.generator = new BuildGenerator(this);

    // Shared state containers
    this.analysis = null;
    this.resolution = null;
    this.installation = null;
    this.collection = null;
    this.transformed = null;
    this.buildOutput = null;
    this.generatedVNodes = null;
    this.generatedHTML = null;
    this.runtime = null;
    this.widgetMetadata = null;

    if (this.config.debugMode) {
      console.log(chalk.blue("\n[BuildIntegration] Initialized"));
      console.log(chalk.gray(`  projectRoot: ${projectRoot}`));
      console.log(chalk.gray(`  mode: ${this.config.mode}`));
      console.log(chalk.gray(`  outputDir: ${this.config.outputDir}\n`));
    }
  }

  /**
   * ========================================================================
   * MAIN PIPELINE EXECUTION
   * ========================================================================
   */
  async execute() {
    console.log(chalk.blue("\n" + "=".repeat(70)));
    console.log(chalk.blue("FLUTTERJS BUILD INTEGRATION PIPELINE"));
    console.log(chalk.blue("=".repeat(70)));

    const startTime = Date.now();

    try {
      // ========== ANALYSIS PHASE ==========
      // Phases 1-7: Analyze, resolve, install, collect, transform, initialize, build

      await this.analyzer.phase1_analyze();
      await this.analyzer.phase2_resolveDependencies();

      if (this.config.installDependencies) {
        await this.analyzer.phase3_installPackages();
      }

      await this.analyzer.phase4_collectPackages();
      await this.analyzer.phase5_transformCode();
      await this.analyzer.phase6_initializeRuntime();
      await this.analyzer.phase7_buildWidgets();

      // ========== GENERATION PHASE ==========
      // Phases 8-10: Generate HTML, output files, and report

      await this.generator.phase8_generateHTML();
      await this.generator.phase9_generateOutput();

      const duration = Date.now() - startTime;
      this.generator.phase10_report(duration);

      return {
        success: true,
        duration,
        analysis: this.analysis,
        resolution: this.resolution,
        installation: this.installation,
        collection: this.collection,
        transformed: this.transformed,
        output: this.buildOutput,
      };
    } catch (error) {
      console.error(chalk.red("\n✗ Build Failed:"), error.message);
      if (this.config.debugMode) {
        console.error(error.stack);
      }
      throw error;
    }
  }
}

export { BuildIntegration };
export default BuildIntegration;