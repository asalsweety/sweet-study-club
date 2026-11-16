const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

let application;
let window;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function screenshot(file) {
  // Hidden Windows windows can return their previous compositor frame once.
  await window.webContents.capturePage();
  await sleep(150);
  await fs.writeFile(file, (await window.webContents.capturePage()).toPNG());
}
async function until(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await window.webContents.executeJavaScript(expression)) return;
    await sleep(50);
  }
  throw new Error('UI condition timed out: ' + expression);
}
app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '..');
  const { createApplication } = await import('../src/application.mjs');
  await fs.mkdir(path.join(root, '.data'), { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, '.data', 'ui-smoke-'));
  let status = 'InMeeting';
  const client = {
    apiKey: 'ui-test-only',
    async createBot() { return { bot_id: 'ui-test-bot', status: 'Active', transcript_id: 'ui-transcript' }; },
    async status() { return { status }; },
    async stop() { status = 'Stopped'; return { status: 'already_stopped', bot_status: status }; },
    async pause() {},
    async streams() { return { processing: true, streams: [] }; },
    async transcript() { return { processing: true, segments: [] }; },
  };
  application = await createApplication({ dataDir: directory, apiKey: 'ui-test-only', port: 0, client, tunnel: false });
  application.service.setConnection({ state: 'connected', url: 'https://test.example', message: 'Webhooks connected' });
  window = new BrowserWindow({ width: 1360, height: 900, show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  window.webContents.on('console-message', details => { if (details.level === 'error' || details.level === 3) { errors.push(details.message); console.error('Renderer:', details.message); } });
  await window.loadURL(application.servers.launchUrl);
  await until('document.querySelector(".empty-state")?.textContent.includes("Your first recording")');
  const artifacts = path.join(root, 'artifacts');
  await fs.mkdir(artifacts, { recursive: true });
  await screenshot(path.join(artifacts, 'library.png'));
  await window.webContents.executeJavaScript('document.querySelector("[data-action=new]").click()');
  await until('document.querySelector("#new-dialog").open');
  await screenshot(path.join(artifacts, 'new-recording.png'));
  await window.webContents.executeJavaScript(`document.querySelector('#meeting-link').value = 'https://meet.google.com/meet/guf-tjiw-msq'; document.querySelector('#meeting-title').value = 'Product team catch-up'; document.querySelector('#recording-form').requestSubmit();`);
  await until('document.querySelector("#detail-title")?.textContent === "Product team catch-up"');
  const recording = application.service.store.data.recordings[0];
  assert.equal(recording.meetingLink, 'https://meet.google.com/guf-tjiw-msq');
  await application.service.receive(recording.id, { bot_id: recording.botId, event: 'bot.inmeeting', bot_status: 'InMeeting' });
  await application.service.receive(recording.id, { bot_id: recording.botId, speakerName: 'Jane Smith', speakerId: '7', timestamp: new Date().toISOString(), transcript: 'Each person’s microphone and webcam will be saved separately.', transcription_mode: 'sentence' }, true);
  await application.service.drain();
  await window.webContents.executeJavaScript('document.querySelector("[data-tab=transcript]").click()');
  await until('document.querySelector("#detail-panel").textContent.includes("Each person")');
  await sleep(200);
  await screenshot(path.join(artifacts, 'live-transcript.png'));
  await window.webContents.executeJavaScript('document.querySelector("[data-detail-action=rename]").click(); document.querySelector("#rename-title").value = "<img src=x onerror=alert(1)>"; document.querySelector("#rename-form").requestSubmit();');
  await until('document.querySelector("#detail-title").textContent.includes("<img")');
  assert.equal(await window.webContents.executeJavaScript('document.querySelector("#detail-title img") === null'), true);
  await window.webContents.executeJavaScript('document.querySelector("[data-detail-action=stop]").click()');
  await until('document.querySelector("#detail-status").textContent.includes("Processing")');
  recording.tasks.video = { state: 'done', attempts: 0, empty: false };
  recording.tracks = [{ id: '0123456789abcdef0123', participantId: 'person-7', participantName: 'Jane Smith', kind: 'video', source: 'screenshare', state: 'saved', bytes: 12, start: 0, duration: 10 }];
  await application.service.update(recording);
  await until('document.querySelector("#detail-alert").textContent.includes("MeetStream returned no webcam files")');
  await window.webContents.executeJavaScript('document.querySelector("[data-tab=tracks]").click()');
  await until('document.querySelector("#detail-panel").textContent.includes("No webcam file returned by MeetStream for this participant")');
  assert.match(await window.webContents.executeJavaScript('document.querySelector("#job-strip").textContent'), /0 webcams · 1 screen share/);
  await screenshot(path.join(artifacts, 'missing-webcam.png'));
  recording.tracks = [];
  recording.tasks.video = { state: 'pending', attempts: 0, nextAt: Date.now(), startedAt: Date.now() };
  await application.service.update(recording);
  await until('document.querySelector("#detail-alert").textContent === ""');
  await window.webContents.executeJavaScript('document.querySelector("[data-action=settings]").click()');
  await until('document.querySelector("#settings-view").hidden === false');
  assert.equal(await window.webContents.executeJavaScript('document.body.innerHTML.includes("ui-test-only")'), false);
  await screenshot(path.join(artifacts, 'settings.png'));
  await window.setSize(960, 720);
  await window.webContents.executeJavaScript('document.querySelector("[data-action=library]").click()');
  await sleep(100);
  assert.equal(await window.webContents.executeJavaScript('document.documentElement.scrollWidth <= innerWidth'), true);
  if (errors.length) throw new Error('Renderer errors: ' + errors.join('\n'));
  console.log('Electron UI smoke test passed: empty library, deploy form, normalized meeting link, live transcript, safe rename, stop, missing-webcam status, settings, narrow layout.');
  await application.close();
  window.destroy();
  app.exit(0);
}).catch(async error => {
  console.error(error.stack);
  if (window && !window.isDestroyed()) {
    const root = path.resolve(__dirname, '..');
    await fs.writeFile(path.join(root, 'artifacts', 'failure.png'), (await window.webContents.capturePage()).toPNG());
    console.error(await window.webContents.executeJavaScript('document.body.innerText'));
    console.error('Stored captions:', application?.service.store.data.recordings[0]?.captions.length);
  }
  if (application) await application.close();
  if (window) window.destroy();
  app.exit(1);
});
