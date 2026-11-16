import { createApplication } from './application.mjs';

const app = await createApplication();
console.log(`MeetStream Recorder: ${app.servers.launchUrl}`);
console.log(`Local recordings: ${app.config.dataDir}`);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await app.close();
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
