#!/usr/bin/env node

const { init } = require('../commands/init');
const { dev } = require('../commands/dev');
const { build } = require('../commands/build');
const { preview } = require('../commands/preview');

const args = process.argv.slice(2);
const command = args[0];

function parseOptions(args) {
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function showHelp() {
  console.log(`
Flutter.js CLI - Build tool for Flutter to JavaScript projects

Usage:
  flutter_js <command> [options]

Commands:
  init <name>   Create a new Flutter.js project
  dev           Start development server
  build         Build the application for production
  preview       Preview production build locally

Init Options:
  flutter_js init my-app              Create new project
  flutter_js init my-app --template   Use specific template

Dev Options:
  -p, --port <port>      Port number [default: 3000]
  --open                Open browser automatically

Build Options:
  -m, --mode <mode>      Build mode (ssr/csr) [default: from config]
  -o, --output <dir>     Output directory [default: dist]
  --no-minify           Disable minification
  --no-obfuscate        Disable obfuscation

Preview Options:
  -p, --port <port>      Port number [default: 4173]
  --open                Open browser automatically

Global Options:
  -v, --version         Show version
  -h, --help            Show help

Examples:
  flutter_js init my-app
  flutter_js dev --port 8080
  flutter_js build --mode ssr
  flutter_js preview
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`flutter_js v${pkg.version}`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    showVersion();
    process.exit(0);
  }

  const options = parseOptions(args);
  
  // Set defaults
  options.mode = options.mode || options.m || 'prod';
  options.output = options.output || options.o || 'dist';
  options.port = options.port || options.p || (command === 'preview' ? '4173' : '3000');
  options.minify = options['no-minify'] ? false : (options.minify !== false);
  options.obfuscate = options['no-obfuscate'] ? false : (options.obfuscate !== false);
  options.open = options.open !== false;

  try {
    switch (command) {
      case 'init':
        await init(args[1], options);
        break;
      case 'dev':
        await dev(options);
        break;
      case 'build':
        await build(options);
        break;
      case 'preview':
        await preview(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();