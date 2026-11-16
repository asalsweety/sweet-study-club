const { app, BrowserWindow, shell, dialog, safeStorage, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let application;
let window;
let quitting = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.show(); window.focus(); } });
  app.whenReady().then(async () => {
    const { createApplication } = await import('../src/application.mjs');
    const { configuration } = await import('../src/config.mjs');
    const keyFile = path.join(app.getPath('userData'), 'credential.enc');
    const config = configuration();
    if (app.isPackaged) {
      if (!process.env.MEETSTREAM_PORT) config.port = 0;
      if (!config.tunnelBinary) config.tunnelBinary = path.join(process.resourcesPath, 'cloudflared', process.arch, 'cloudflared');
    }
    if (!config.apiKey && safeStorage.isEncryptionAvailable()) {
      try { config.apiKey = safeStorage.decryptString(await fs.readFile(keyFile)); } catch {}
    }
    application = await createApplication({
      ...config,
      openFolder: async id => {
        const folder = application.service.store.folder(id);
        await fs.mkdir(folder, { recursive: true });
        const error = await shell.openPath(folder);
        if (error) throw new Error(error);
      },
      saveKey: async key => {
        if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable. Set MEETSTREAM_API_KEY in your environment instead.');
        await fs.mkdir(path.dirname(keyFile), { recursive: true });
        await fs.writeFile(keyFile, safeStorage.encryptString(key), { mode: 0o600 });
      },
    });
    const openWindow = () => {
      window = new BrowserWindow({
        width: 1360, height: 900, minWidth: 900, minHeight: 650,
        title: 'MeetStream Recorder', backgroundColor: '#f7f8fa',
        ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 20 } } : {}),
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\/(meet\.google\.com|docs\.meetstream\.ai|app\.meetstream\.ai)(\/|$)/.test(url)) shell.openExternal(url);
        return { action: 'deny' };
      });
      window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== application.servers.url) event.preventDefault(); });
      window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
      window.loadURL(application.servers.launchUrl);
    };
    openWindow();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
    ]));
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); });
  }).catch(error => { dialog.showErrorBox('Could not start MeetStream Recorder', error.message); app.quit(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', event => {
    if (quitting || !application) return;
    const active = application.service.store.data.recordings.filter(recording => recording.botId && !recording.endedAt);
    if (active.length) {
      event.preventDefault();
      const choice = dialog.showMessageBoxSync({ type: 'question', title: 'Recording in progress', message: `${active.length} meeting bot${active.length === 1 ? ' is' : 's are'} still running.`, detail: 'Keep the app open to receive live transcripts and save tracks automatically. You can stop the bots and quit, or return to the app.', buttons: ['Keep recording', 'Stop bots and quit'], defaultId: 0, cancelId: 0 });
      if (choice !== 1) return;
      quitting = true;
      Promise.allSettled(active.map(recording => application.service.stop(recording.id))).then(() => application.close()).finally(() => app.quit());
    } else {
      event.preventDefault(); quitting = true;
      application.close().finally(() => app.quit());
    }
  });
}
