import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function inside(root, relative) {
  const target = path.resolve(root, relative);
  const relation = path.relative(path.resolve(root), target);
  if (relation.startsWith('..') || path.isAbsolute(relation)) throw new Error('Invalid local file path.');
  return target;
}

export class LibraryStore {
  constructor(directory) {
    this.directory = directory;
    this.file = path.join(directory, 'library.json');
    this.data = { version: 1, recordings: [], inbox: [], processedEvents: [] };
    this.writes = Promise.resolve();
  }
  async init() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.recordings) || !Array.isArray(data.inbox) || !Array.isArray(data.processedEvents)) throw new Error('Unsupported library format.');
      this.data = data;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot read the recording library. Preserve library.json and restore a valid backup before restarting.', { cause: error });
      await this.save();
    }
    return this;
  }
  recording(id) { return this.data.recordings.find(recording => recording.id === id); }
  folder(id) {
    if (!this.recording(id)) throw new Error('Recording not found.');
    return inside(this.directory, `recordings/${id}`);
  }
  async save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    const operation = this.writes.catch(() => {}).then(async () => {
      await writeFile(`${this.file}.tmp`, snapshot, { mode: 0o600 });
      await rename(`${this.file}.tmp`, this.file);
    });
    this.writes = operation;
    return operation;
  }
  async manifest(recording) {
    const folder = this.folder(recording.id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const manifest = {
      version: 1, title: recording.title, botId: recording.botId,
      meetingLink: recording.meetingLink, createdAt: recording.createdAt,
      endedAt: recording.endedAt, tracks: recording.tracks,
      timeline: 'start is seconds from the beginning of the meeting recording; preserve offsets when editing.',
    };
    await writeFile(path.join(folder, 'manifest.json.tmp'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await rename(path.join(folder, 'manifest.json.tmp'), path.join(folder, 'manifest.json'));
  }
}
