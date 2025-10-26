/**
 * Logger utility for consistent CLI output
 * Provides colored logging with proper formatting
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Check if colors should be disabled
 */
function shouldUseColors() {
  // Disable colors if NO_COLOR env var is set
  if (process.env.NO_COLOR) {
    return false;
  }
  
  // Disable colors if not in TTY
  if (!process.stdout.isTTY) {
    return false;
  }
  
  return true;
}

const useColors = shouldUseColors();

/**
 * Apply color to text
 */
function colorize(text, color) {
  if (!useColors) {
    return text;
  }
  return `${color}${text}${colors.reset}`;
}

/**
 * Success message (green)
 */
function success(message) {
  console.log(colorize('✓', colors.green) + ' ' + message);
}

/**
 * Error message (red)
 */
function error(message) {
  console.error(colorize('✗', colors.red) + ' ' + message);
}

/**
 * Warning message (yellow)
 */
function warn(message) {
  console.warn(colorize('⚠', colors.yellow) + ' ' + message);
}

/**
 * Info message (cyan)
 */
function info(message) {
  console.log(colorize('ℹ', colors.cyan) + ' ' + message);
}

/**
 * Debug message (dim)
 */
function debug(message) {
  if (process.env.DEBUG) {
    console.log(colorize('◆', colors.dim) + ' ' + colorize(message, colors.dim));
  }
}

/**
 * Log with emoji prefix
 */
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

/**
 * Create a section header
 */
function section(title) {
  console.log('\n' + colorize(title, colors.bright));
}

/**
 * Create a box around text
 */
function box(message, type = 'info') {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const border = '─'.repeat(maxLength + 2);
  
  let color = colors.cyan;
  if (type === 'error') color = colors.red;
  if (type === 'warn') color = colors.yellow;
  if (type === 'success') color = colors.green;
  
  console.log(colorize('┌' + border + '┐', color));
  lines.forEach(line => {
    const padding = ' '.repeat(maxLength - line.length);
    console.log(colorize('│', color) + ' ' + line + padding + ' ' + colorize('│', color));
  });
  console.log(colorize('└' + border + '┘', color));
}

/**
 * Progress spinner
 */
class Spinner {
  constructor(message) {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
    this.isSpinning = false;
  }
  
  start() {
    if (!useColors || !process.stdout.isTTY) {
      console.log(this.message);
      return;
    }
    
    this.isSpinning = true;
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${colorize(frame, colors.cyan)} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }
  
  stop(message, type = 'success') {
    if (!this.isSpinning) {
      return;
    }
    
    this.isSpinning = false;
    clearInterval(this.interval);
    
    if (useColors && process.stdout.isTTY) {
      process.stdout.write('\r\x1b[K'); // Clear line
    }
    
    if (type === 'success') {
      success(message || this.message);
    } else if (type === 'error') {
      error(message || this.message);
    } else if (type === 'warn') {
      warn(message || this.message);
    } else {
      info(message || this.message);
    }
  }
  
  update(message) {
    this.message = message;
  }
}

/**
 * Create a new spinner
 */
function spinner(message) {
  return new Spinner(message);
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Format milliseconds to human readable
 */
function formatTime(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * Create a table
 */
function table(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }
  
  const keys = Object.keys(data[0]);
  const maxLengths = keys.map(key => {
    return Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
  });
  
  // Header
  const header = keys.map((key, i) => key.padEnd(maxLengths[i])).join(' │ ');
  const separator = maxLengths.map(len => '─'.repeat(len)).join('─┼─');
  
  console.log(colorize(header, colors.bright));
  console.log(colorize(separator, colors.dim));
  
  // Rows
  data.forEach(row => {
    const line = keys.map((key, i) => {
      return String(row[key] || '').padEnd(maxLengths[i]);
    }).join(' │ ');
    console.log(line);
  });
}

/**
 * Clear console
 */
function clear() {
  if (process.stdout.isTTY) {
    console.clear();
  }
}

/**
 * Create a newline
 */
function newline() {
  console.log('');
}

module.exports = {
  success,
  error,
  warn,
  info,
  debug,
  log,
  section,
  box,
  spinner,
  formatBytes,
  formatTime,
  table,
  clear,
  newline,
  colors,
  colorize,
};