import { spawn } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class WebhookTunnel {
  constructor({ dataDir, binary, onChange }) {
    this.directory = path.join(dataDir, 'bin');
    this.binary = binary || path.join(this.directory, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    this.onChange = onChange;
    this.stopped = false;
  }
  async start(port) {
    this.port = port;
    this.onChange({ state: 'connecting', message: 'Starting secure webhook connection…' });
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      try { await access(this.binary); }
      catch {
        this.onChange({ state: 'connecting', message: 'Downloading the webhook tunnel on first launch…' });
        const { install } = await import('cloudflared');
        await install(this.binary);
      }
      if (this.stopped) return;
      // A separate empty config prevents an existing user tunnel configuration from interfering.
      const config = path.join(this.directory, 'recorder-tunnel.yml');
      await writeFile(config, '{}\n', { mode: 0o600 });
      const child = spawn(this.binary, ['tunnel', '--config', config, '--no-autoupdate', '--protocol', 'http2', '--url', `http://127.0.0.1:${port}`], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      this.child = child;
      let url;
      let connected = false;
      let announced = false;
      let output = '';
      const read = data => {
        output = (output + data.toString()).slice(-12_000);
        url ||= /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(output)?.[0];
        if (output.includes('Registered tunnel connection')) connected = true;
        if (url && connected && !announced) {
          announced = true;
          clearTimeout(this.startupTimer);
          this.onChange({ state: 'connected', url, message: 'Webhooks connected' });
        }
      };
      child.stdout.on('data', read);
      child.stderr.on('data', read);
      child.on('error', () => this.onChange({ state: 'error', message: 'Could not start the webhook tunnel. Use Reconnect to retry.' }));
      child.on('exit', () => {
        clearTimeout(this.startupTimer);
        if (this.stopped) return;
        this.onChange({ state: 'reconnecting', message: 'Webhook connection interrupted. Reconnecting; saved recordings are safe.' });
        this.restartTimer = setTimeout(() => this.start(port), 5000);
        this.restartTimer.unref();
      });
      this.startupTimer = setTimeout(() => {
        if (!connected) this.onChange({ state: 'error', message: 'The webhook tunnel could not connect. Check your network and use Reconnect.' });
      }, 45_000);
      this.startupTimer.unref();
    } catch {
      this.onChange({ state: 'error', message: 'Webhook tunnel setup failed. Check your internet connection and use Reconnect.' });
    }
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.restartTimer);
    clearTimeout(this.startupTimer);
    this.child?.kill();
  }
}
