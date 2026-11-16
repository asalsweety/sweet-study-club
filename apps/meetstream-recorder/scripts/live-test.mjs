import { setTimeout as sleep } from 'node:timers/promises';
import { createApplication } from '../src/application.mjs';
import { loadEnvironment } from '../src/config.mjs';

loadEnvironment();
const args = process.argv.slice(2);
const link = args.find(argument => argument.startsWith('https://meet.google.com/'));
if (!link || !process.env.MEETSTREAM_API_KEY) {
  console.error('Usage: npm run test:live -- https://meet.google.com/abc-defg-hij [--seconds 180]');
  console.error('Set MEETSTREAM_API_KEY in your environment or .env.local first.');
  process.exit(1);
}
const secondsIndex = args.indexOf('--seconds');
const seconds = secondsIndex < 0 ? 180 : Number(args[secondsIndex + 1]);
if (!Number.isFinite(seconds) || seconds < 10 || seconds > 1800) throw new Error('--seconds must be between 10 and 1800.');
const application = await createApplication({ port: 0 });
const { service } = application;
console.log(`Recording manager: ${application.servers.launchUrl}`);
let recording;
let captionCount = 0;
let admitted = false;
let interrupted = false;
process.on('SIGINT', () => { interrupted = true; });
process.on('SIGTERM', () => { interrupted = true; });
service.on('transcript', segment => {
  if (segment.final) {
    captionCount++;
    // Printing transcript contents is explicitly requested by this opt-in live test only.
    console.log(`[${segment.speaker}] ${segment.transcript}`);
  }
});
let previousStatus;
service.on('change', () => {
  if (!recording) return;
  if (recording.admittedAt) admitted = true;
  if (recording.status !== previousStatus) {
    previousStatus = recording.status;
    console.log(`Bot status: ${recording.status}`);
    if (recording.status === 'InWaitingRoom') console.log('Admit “MeetStream Recorder Test” from Google Meet, then speak with your camera on.');
  }
});
try {
  console.log('Connecting the HTTPS webhook receiver…');
  const tunnelDeadline = Date.now() + 120_000;
  while (service.connection.state !== 'connected') {
    if (interrupted) throw new Error('Test interrupted before the bot was created.');
    if (service.connection.state === 'error' || Date.now() > tunnelDeadline) throw new Error(service.connection.message || 'The webhook tunnel did not connect.');
    await sleep(500);
  }
  await service.client.request('/bots');
  recording = await service.create({ meetingLink: link, title: 'Live integration test', botName: 'MeetStream Recorder Test', live: true });
  console.log(`Created bot ${recording.botId}. The test will request a stop in ${seconds} seconds.`);
  const deadline = Date.now() + seconds * 1000;
  while (!interrupted && !recording.endedAt && Date.now() < deadline) await sleep(1000);
  if (!recording.endedAt) {
    await service.stop(recording.id);
    console.log('Stop requested. Waiting for local participant files and post-call transcript…');
  }
  const processingDeadline = Date.now() + 8 * 60_000;
  while (!interrupted && Date.now() < processingDeadline) {
    const tasks = Object.values(recording.tasks);
    if (recording.endedAt && tasks.length && tasks.every(task => ['done', 'failed'].includes(task.state))) break;
    if (recording.pipelineDone && !recording.admittedAt) break;
    await sleep(1000);
  }
  const summary = {
    botId: recording.botId,
    admitted,
    liveTranscriptSegments: captionCount,
    savedAudioTracks: recording.tracks.filter(track => track.kind === 'audio' && track.state === 'saved').length,
    savedVideoTracks: recording.tracks.filter(track => track.kind === 'video' && track.state === 'saved').length,
    postCallSegments: recording.transcript.length,
    tasks: Object.fromEntries(Object.entries(recording.tasks).map(([kind, task]) => [kind, { state: task.state, error: task.error || null }])),
    folder: service.store.folder(recording.id),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!admitted || !captionCount || !summary.savedAudioTracks || !summary.savedVideoTracks || recording.tasks.transcript?.state !== 'done') process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (recording?.botId && !recording.endedAt) {
    try { await service.stop(recording.id); } catch (error) { console.error(`Could not confirm bot stop: ${error.message}`); process.exitCode = 1; }
  }
  await application.close();
}
