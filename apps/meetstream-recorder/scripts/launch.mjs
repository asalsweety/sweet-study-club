import { spawn } from 'node:child_process';
import electron from 'electron';
import { projectRoot, loadEnvironment } from '../src/config.mjs';

loadEnvironment();
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [projectRoot], { stdio: 'inherit', env: environment, windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
