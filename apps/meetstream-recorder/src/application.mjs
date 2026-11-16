import { configuration } from './config.mjs';
import { MeetStreamClient } from './client.mjs';
import { LibraryStore } from './store.mjs';
import { RecorderService } from './service.mjs';
import { createServers } from './server.mjs';
import { WebhookTunnel } from './tunnel.mjs';

export async function createApplication(options = {}) {
  const config = configuration(options);
  const client = options.client || new MeetStreamClient({ apiKey: config.apiKey });
  const store = new LibraryStore(config.dataDir);
  const service = await new RecorderService({ store, client, ...options.serviceOptions }).init();
  let servers;
  try { servers = await createServers({ service, port: config.port, callbackPort: config.callbackPort, webhookSecret: config.webhookSecret, openFolder: options.openFolder, saveKey: options.saveKey }); }
  catch (error) { await service.close(); throw error; }
  let tunnel;
  const connect = () => {
    tunnel?.stop();
    if (config.publicUrl) {
      const url = new URL(config.publicUrl);
      if (url.protocol !== 'https:') throw new Error('MEETSTREAM_PUBLIC_URL must use HTTPS and forward to the callback listener.');
      service.setConnection({ state: 'connected', url: url.origin, message: 'Custom webhook connection' });
    } else if (options.tunnel !== false) {
      tunnel = new WebhookTunnel({ dataDir: config.dataDir, binary: config.tunnelBinary, onChange: connection => service.setConnection(connection) });
      tunnel.start(servers.callbackPort);
    }
  };
  service.on('reconnect', connect);
  connect();
  return {
    service, servers, config,
    async close() { tunnel?.stop(); await servers.close(); await service.close(); },
  };
}
