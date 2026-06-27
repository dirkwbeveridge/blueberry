#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const withPush = process.argv.includes('--with-push');

function runStep(command, args, label) {
  console.log(`\n[STEP] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  const code = result.status ?? 1;
  if (code !== 0) {
    console.log(`\n[FAIL] ${label} (exit ${code})`);
    process.exit(code);
  }

  console.log(`[PASS] ${label}`);
}

console.log('Blueberry Integration Smoke');
console.log(`Root: ${root}`);
console.log(`Mode: ${withPush ? 'base + push readiness' : 'base only'}`);

runStep('npm', ['run', 'typecheck'], 'TypeScript typecheck');
runStep('npm', ['run', 'lint', '--', '--no-cache'], 'ESLint (no cache)');

if (withPush) {
  runStep('node', ['scripts/push-readiness-check.mjs'], 'Push readiness precheck');
}

console.log('\n[DONE] Integration smoke checks passed.');
