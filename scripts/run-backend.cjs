const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const venvPython = isWindows
  ? path.join(rootDir, '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, '.venv', 'bin', 'python');

function getCommandAndArgs() {
  if (fs.existsSync(venvPython)) {
    return {
      command: venvPython,
      args: ['-m', 'uvicorn', 'api:app', '--reload', '--app-dir', 'rendor'],
    };
  }

  if (isWindows) {
    return {
      command: 'py',
      args: ['-3', '-m', 'uvicorn', 'api:app', '--reload', '--app-dir', 'rendor'],
    };
  }

  return {
    command: 'python3',
    args: ['-m', 'uvicorn', 'api:app', '--reload', '--app-dir', 'rendor'],
  };
}

const { command, args } = getCommandAndArgs();

const child = spawn(command, args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error('[backend] Failed to start FastAPI backend:', error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});