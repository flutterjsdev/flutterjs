// build.js
import { mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await mkdir('dist', { recursive: true });
await copyFile(resolve(__dirname, 'src/index.js'), resolve(__dirname, 'dist/index.js'));

console.log('Build complete: dist/index.js created');