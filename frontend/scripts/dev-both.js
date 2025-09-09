#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Start backend API on :8080
const api = spawn('npm', ['run', 'dev'], { cwd: path.resolve(__dirname, '..', '..'), stdio: 'inherit', shell: true });

// Start frontend on :3000 after slight delay to avoid log interleaving
setTimeout(() => {
  const fe = spawn('npm', ['run', 'dev'], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', shell: true });
  fe.on('close', (code) => process.exit(code));
}, 500);

process.on('SIGINT', () => {
  api.kill('SIGINT');
  process.exit(0);
});

