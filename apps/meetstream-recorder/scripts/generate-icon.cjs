const { app, BrowserWindow } = require('electron');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = (await readFile(path.join(root, 'ui', 'icon.svg'))).toString('base64');
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await window.loadURL('data:text/html,<html><body></body></html>');
  const pngs = await window.webContents.executeJavaScript(`(async () => {
    const source = new Image();
    source.src = 'data:image/svg+xml;base64,${svg}';
    await source.decode();
    const result = {};
    for (const size of [128, 256, 512, 1024]) {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      canvas.getContext('2d').drawImage(source, 0, 0, size, size);
      result[size] = canvas.toDataURL('image/png').split(',')[1];
    }
    return result;
  })()`);
  const directory = path.join(root, 'build-resources');
  await mkdir(directory, { recursive: true });
  const parts = [];
  for (const [size, type] of [[128, 'ic07'], [256, 'ic08'], [512, 'ic09'], [1024, 'ic10']]) {
    const png = Buffer.from(pngs[size], 'base64');
    const header = Buffer.alloc(8); header.write(type); header.writeUInt32BE(png.length + 8, 4);
    parts.push(header, png);
  }
  const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(parts.reduce((sum, part) => sum + part.length, 8), 4);
  await writeFile(path.join(directory, 'icon.icns'), Buffer.concat([header, ...parts]));
  await writeFile(path.join(directory, 'icon.png'), Buffer.from(pngs[1024], 'base64'));
  console.log('Generated macOS application icon from the existing SVG brand mark.');
  window.destroy(); app.exit(0);
}).catch(error => { console.error(error.message); app.exit(1); });
