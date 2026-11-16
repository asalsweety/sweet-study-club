import { spawn } from 'node:child_process';
import electron from 'electron';
import { projectRoot } from '../src/config.mjs';
import path from 'node:path';

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.join(projectRoot, 'scripts/ui-smoke.cjs')], { stdio: 'inherit', env: environment, windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
