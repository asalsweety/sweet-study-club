const paths = {
  library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10m10-10a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M10 12h4"/>',
  settings: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  video: '<rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 9 6-3v12l-6-3"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-4-4 3-3m-6 0 3-3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8m-4-5v5"/>',
  transcript: '<path d="M5 3h14v18H5Zm3 5h8m-8 4h8m-8 4h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = name => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.video}</svg>`;
for (const element of document.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const bytes = value => {
  if (!value) return '0 B';
  const index = Math.min(3, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][index]}`;
};
const time = seconds => `${Math.floor(Math.max(0, seconds || 0) / 60)}:${String(Math.floor(Math.max(0, seconds || 0) % 60)).padStart(2, '0')}`;
const date = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const initials = name => String(name || '?').split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
let state = { recordings: [], connection: { state: 'connecting' } };
let filter = 'all';
let statusFilter = 'all';
let selectedId;
let selectedTab = 'tracks';
let detailKey;
let currentView = 'library';
let toastTimer;
let stream;

async function api(endpoint, body = {}) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Recorder-Request': '1' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6000);
}
function category(recording) {
  if (recording.endedAt && (recording.cancelledBeforeAdmission || recording.captureSkipped)) return 'attention';
  if (recording.createError || Object.values(recording.tasks).some(task => task.state === 'failed') || ['error', 'failed', 'notallowed', 'denied'].includes(recording.status.toLowerCase())) return 'attention';
  if (!recording.endedAt && recording.botId) return 'live';
  const tasks = Object.values(recording.tasks);
  if (tasks.length && tasks.every(task => task.state === 'done')) return 'ready';
  return 'processing';
}
function statusBadge(recording) {
  const kind = category(recording);
  const label = recording.captureSkipped || (recording.endedAt && recording.cancelledBeforeAdmission) ? 'Not recorded' : kind === 'ready' ? 'Ready' : kind === 'attention' ? 'Needs attention' : kind === 'processing' ? 'Processing' : recording.paused ? 'Paused' : recording.status === 'InMeeting' || recording.status === 'Recording' ? 'Recording' : recording.status === 'InWaitingRoom' ? 'Waiting for admission' : recording.status;
  return `<span class="status ${kind === 'attention' ? 'error' : kind}"><span class="status-dot"></span>${escape(label)}</span>`;
}
function show(view) {
  currentView = view;
  for (const name of ['library', 'detail', 'settings']) $(`#${name}-view`).hidden = name !== view;
}
function renderShell() {
  const current = state.recordings.filter(recording => !recording.archived);
  $('#all-count').textContent = current.length;
  $('#live-count').textContent = current.filter(recording => category(recording) === 'live').length;
  $('#processing-count').textContent = current.filter(recording => category(recording) === 'processing').length;
  $('#stat-total').textContent = current.length;
  $('#stat-tracks').textContent = current.reduce((sum, recording) => sum + recording.tracks.filter(track => track.state === 'saved').length, 0);
  $('#stat-size').textContent = bytes(current.reduce((sum, recording) => sum + recording.tracks.filter(track => track.state === 'saved').reduce((total, track) => total + track.bytes, 0), 0));
  $('#connection-label').textContent = state.connection.state === 'connected' ? 'Webhooks connected' : state.connection.state === 'error' ? 'Connection needs attention' : 'Connecting webhooks…';
  $('#connection-dot').className = `connection-dot ${state.connection.state}`;
  $('#key-status').textContent = state.configured ? 'Your API key is configured. It stays in the app’s backend.' : 'Add your API key to start recording.';
  $('#storage-path').textContent = state.dataDir || '';
  $('#tunnel-status').textContent = state.connection.message || 'Connecting…';
  const banner = $('#connection-banner');
  if (!state.configured) {
    banner.hidden = false;
    banner.innerHTML = 'Connect your MeetStream account to start recording. <button data-action="settings">Open Settings</button>';
  } else if (state.connection.state !== 'connected') {
    banner.hidden = false;
    banner.textContent = state.connection.message || 'Connecting webhooks…';
  } else banner.hidden = true;
  $('#send-bot').disabled = !state.configured || state.connection.state !== 'connected';
}
function renderLibrary() {
  const query = $('#search').value.trim().toLowerCase();
  const recordings = state.recordings.filter(recording => {
    const kind = category(recording);
    if (filter === 'archived' ? !recording.archived : recording.archived) return false;
    if (filter === 'live' && kind !== 'live') return false;
    if (filter === 'processing' && kind !== 'processing') return false;
    if (statusFilter !== 'all' && (statusFilter === 'active' ? !['live', 'processing'].includes(kind) : kind !== statusFilter)) return false;
    return !query || [recording.title, recording.meetingLink, ...recording.tracks.map(track => track.participantName)].join(' ').toLowerCase().includes(query);
  });
  const container = $('#recordings');
  if (!recordings.length) {
    const first = state.recordings.length === 0;
    container.innerHTML = `<div class="empty-state"><div class="empty-illustration">${icon(first ? 'video' : 'search')}</div><h2>${first ? 'Your first recording starts here' : 'No recordings here yet'}</h2><p>${first ? 'Paste a Google Meet link and let your bot handle the recording. Each participant gets their own audio and video files.' : 'Try another filter or start a new meeting recording.'}</p><button class="button primary" data-action="new">＋ Record a meeting</button>${first ? `<div class="empty-footer">${icon('shield')} Saved locally · Separate participant tracks</div>` : ''}</div>`;
    return;
  }
  container.innerHTML = `<div class="recording-list"><div class="list-header"><span>MEETING</span><span>DATE</span><span>PARTICIPANT TRACKS</span><span>STATUS</span></div>${recordings.map(recording => {
    const participants = new Set(recording.tracks.map(track => track.participantId)).size;
    const totalBytes = recording.tracks.reduce((sum, track) => sum + (track.bytes || 0), 0);
    return `<button class="recording-row" data-recording="${recording.id}"><div class="meeting-cell"><span class="meeting-icon">${icon('video')}</span><div><strong>${escape(recording.title)}</strong><small>Google Meet · ${escape(recording.meetingLink.split('/').pop())}</small></div></div><div class="table-secondary">${escape(date(recording.createdAt))}<small>${new Date(recording.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small></div><div class="table-secondary">${participants ? `${participants} participant${participants === 1 ? '' : 's'}` : 'Waiting for tracks'}<small>${recording.tracks.length} files${totalBytes ? ` · ${bytes(totalBytes)}` : ''}</small></div><div>${statusBadge(recording)}</div></button>`;
  }).join('')}</div>`;
}
function openRecording(id) {
  selectedId = id;
  selectedTab = 'tracks';
  detailKey = null;
  show('detail');
  renderDetail();
}
function renderDetail() {
  const recording = state.recordings.find(item => item.id === selectedId);
  if (!recording) { show('library'); return; }
  const container = $('#detail-view');
  if (container.dataset.recording !== selectedId) {
    container.dataset.recording = selectedId;
    container.innerHTML = `<button class="back-link" data-action="library">← Back to recordings</button><header class="page-heading detail-heading"><div><div class="detail-top" id="detail-status"></div><h1 id="detail-title"></h1><div class="detail-meta" id="detail-meta"></div></div><div class="detail-actions" id="detail-actions"></div></header><div id="detail-alert"></div><div class="job-strip" id="job-strip" hidden></div><div class="tab-bar" role="tablist"><button role="tab" data-tab="tracks">Participant tracks</button><button role="tab" data-tab="transcript">Transcript</button><button role="tab" data-tab="activity">Activity</button></div><div id="detail-panel"></div><p class="detail-caption">Audio and video are original, separate files. The manifest keeps participant identities and timing offsets for editing.</p>`;
    detailKey = null;
  }
  $('#detail-title').textContent = recording.title;
  $('#detail-status').innerHTML = `${statusBadge(recording)}<span class="muted">Google Meet</span>`;
  $('#detail-meta').innerHTML = `<span>${escape(date(recording.createdAt))}</span><a href="${escape(recording.meetingLink)}" target="_blank" rel="noreferrer">${escape(recording.meetingLink.split('/').pop())} ↗</a>${recording.botId ? `<span>Bot ${escape(recording.botId.slice(0, 8))}</span>` : ''}`;
  const active = recording.botId && !recording.endedAt;
  $('#detail-actions').innerHTML = `${active ? `<button class="button small" data-detail-action="pause">${recording.paused ? 'Resume' : 'Pause'}</button><button class="button small danger" data-detail-action="stop">■ Stop recording</button>` : `<button class="button small" data-detail-action="retry">Retry sync</button><button class="button small" data-detail-action="archive">${recording.archived ? 'Unarchive' : 'Archive'}</button>`}<button class="button small" data-detail-action="rename">Rename</button><button class="button small" data-detail-action="folder">${icon('folder')} Open folder</button>`;
  const noWebcams = !recording.captureSkipped && recording.tasks.video?.state === 'done' && !recording.tracks.some(track => track.source === 'webcam' && track.state === 'saved');
  const warning = recording.createError || recording.syncError || (recording.captureSkipped || (recording.endedAt && recording.cancelledBeforeAdmission) ? 'The bot left before entering the meeting. No audio or video was recorded.' : recording.endReason && ['Denied', 'NotAllowed', 'Failed', 'Error'].includes(recording.status) ? recording.activity.at(-1)?.message || 'The bot could not enter this meeting. Check the Activity tab.' : active && recording.status === 'InWaitingRoom' ? 'Your bot is waiting. Admit “' + recording.botName + '” from Google Meet to start recording.' : noWebcams ? 'MeetStream returned no webcam files for this meeting. Any audio and screen shares are listed below. Retry sync to check for files that became available later.' : '');
  $('#detail-alert').innerHTML = warning ? `<div class="banner">${escape(warning)}</div>` : '';
  const jobs = Object.entries(recording.tasks);
  $('#job-strip').hidden = !jobs.length;
  $('#job-strip').innerHTML = jobs.map(([name, job]) => {
    const saved = recording.tracks.filter(track => track.kind === name && track.state === 'saved');
    const webcams = saved.filter(track => track.source === 'webcam').length;
    const shares = saved.filter(track => track.source === 'screenshare').length;
    const done = name === 'video' ? `${webcams} webcam${webcams === 1 ? '' : 's'} · ${shares} screen share${shares === 1 ? '' : 's'}` : job.empty ? 'no captured content' : 'saved';
    return `<span class="job-${job.state === 'failed' ? 'error' : job.state}">${job.state === 'done' ? '✓' : job.state === 'failed' ? '!' : '◌'} ${name === 'transcript' ? 'Transcript' : name === 'audio' ? 'Audio' : 'Video'}: ${escape(job.state === 'done' ? done : job.state === 'failed' ? job.error : job.state === 'running' ? 'saving…' : 'waiting for processing')}</span>`;
  }).join('');
  for (const tab of container.querySelectorAll('[data-tab]')) { tab.classList.toggle('active', tab.dataset.tab === selectedTab); tab.setAttribute('aria-selected', tab.dataset.tab === selectedTab ? 'true' : 'false'); }
  const contentKey = JSON.stringify([selectedTab, recording.endedAt, recording.captureSkipped, recording.cancelledBeforeAdmission, recording.tasks, selectedTab === 'tracks' ? recording.tracks : selectedTab === 'transcript' ? [recording.transcript, recording.captions, recording.partials] : recording.activity]);
  if (contentKey === detailKey) return;
  detailKey = contentKey;
  const panel = $('#detail-panel');
  if (selectedTab === 'tracks') renderTracks(panel, recording);
  if (selectedTab === 'transcript') renderTranscript(panel, recording);
  if (selectedTab === 'activity') panel.innerHTML = `<div class="transcript-panel"><div class="panel-heading"><h2>Meeting activity</h2><small>Connection, capture and processing events</small></div>${recording.activity.length ? [...recording.activity].reverse().map(item => `<div class="activity-row"><time>${new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time><div><strong>${escape(item.event)}</strong>${escape(item.message)}</div></div>`).join('') : '<p class="muted">Waiting for the first bot event…</p>'}</div>`;
}
function renderTracks(panel, recording) {
  if (!recording.tracks.length) {
    const empty = recording.captureSkipped || recording.cancelledBeforeAdmission || ['audio', 'video'].every(kind => recording.tasks[kind]?.state === 'done');
    panel.innerHTML = `<div class="panel-empty">${icon('layers')}<strong>${empty ? 'No participant tracks were captured' : recording.endedAt ? 'Your tracks are being prepared' : 'Individual tracks will appear here'}</strong>${empty ? 'The bot must be admitted, and participants must speak or enable their cameras for tracks to be created.' : recording.endedAt ? 'MeetStream processes the meeting after the bot leaves. Files are saved automatically as they become available.' : 'After the call, each participant’s audio, webcam video and screen shares will be saved separately.'}</div>`;
    return;
  }
  const participants = new Map();
  for (const track of recording.tracks) {
    if (!participants.has(track.participantId)) participants.set(track.participantId, { name: track.participantName, tracks: [] });
    participants.get(track.participantId).tracks.push(track);
  }
  panel.innerHTML = `<div class="panel-heading"><h2>${participants.size} participant${participants.size === 1 ? '' : 's'}</h2><a class="button small" href="/api/recordings/${recording.id}/export/manifest">${icon('download')} Export manifest</a></div><div class="participant-grid">${[...participants.values()].map(participant => `<article class="participant-card"><div class="participant-heading"><span class="avatar">${escape(initials(participant.name))}</span><div><strong>${escape(participant.name)}</strong><small>${participant.tracks.length} separate file${participant.tracks.length === 1 ? '' : 's'}</small></div></div><div class="participant-body">${participant.tracks.sort((a, b) => a.source.localeCompare(b.source)).map(track => {
    const url = `/api/recordings/${recording.id}/tracks/${track.id}`;
    const label = track.source === 'audio' ? 'Microphone audio' : track.source === 'screenshare' ? 'Screen share' : 'Webcam video';
    return `<div class="track-block"><div class="track-info"><span class="track-title">${icon(track.kind === 'audio' ? 'mic' : track.source === 'screenshare' ? 'monitor' : 'video')}${label}</span>${track.state === 'saved' ? `<a href="${url}?download" aria-label="Download ${escape(label)} for ${escape(participant.name)}">${icon('download')}</a>` : ''}</div>${track.state === 'saved' ? track.kind === 'audio' ? `<audio controls preload="none" src="${url}" aria-label="Audio for ${escape(participant.name)}"></audio>` : `<video controls preload="metadata" src="${url}" aria-label="${escape(label)} for ${escape(participant.name)}"></video>` : `<div class="track-status">${escape(track.state === 'failed' ? track.error : `Saving ${bytes(track.bytes)}${track.totalBytes ? ' of ' + bytes(track.totalBytes) : ''}…`)}</div>`}<div class="track-timing">${time(track.duration)} duration · starts at ${time(track.start)}${track.state === 'saved' ? ' · ' + bytes(track.bytes) : ''}</div></div>`;
  }).join('')}${recording.tasks.video?.state === 'done' && !participant.tracks.some(track => track.source === 'webcam' && track.state === 'saved') ? '<div class="track-status">No webcam file returned by MeetStream for this participant.</div>' : ''}</div></article>`).join('')}</div>`;
}
function renderTranscript(panel, recording) {
  const final = recording.tasks.transcript?.state === 'done' && recording.transcript.length;
  const segments = final ? recording.transcript : [...recording.captions, ...Object.values(recording.partials)];
  const title = final ? 'Post-call transcript' : recording.endedAt ? 'Captured live captions' : 'Live transcript';
  const empty = recording.endedAt ? 'No speech has been saved here. Check the processing status and Activity tab for details.' : recording.live ? 'Waiting for speech. Captions begin once the bot is admitted and someone speaks.' : 'Live captions are disabled for this meeting. The post-call transcript will appear after processing.';
  panel.innerHTML = `<div class="transcript-panel"><div class="panel-heading"><div><h2>${title}</h2><small>${final ? 'Speaker-labeled transcript from the recording' : 'Speaker labels follow the active speaker during the call'}</small></div>${final ? `<a class="button small" href="/api/recordings/${recording.id}/export/transcript-txt">${icon('download')} Export text</a>` : `<span class="status ${recording.endedAt || !recording.live ? '' : 'live'}"><span class="status-dot"></span>${recording.endedAt ? 'Saved captions' : recording.live ? 'Live captions' : 'Post-call only'}</span>`}</div>${segments.length ? segments.map(segment => `<div class="transcript-segment ${segment.final === false ? 'partial' : ''}"><span class="avatar">${escape(initials(segment.speaker))}</span><div><div class="segment-heading">${escape(segment.speaker || 'Unknown speaker')}<time>${final ? time(segment.start_time) : new Date(segment.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time></div><p>${escape(segment.transcript)}</p></div></div>`).join('') : `<div class="panel-empty">${empty}</div>`}</div>`;
}
function applyState(next) {
  state = next;
  renderShell();
  if (currentView === 'library') renderLibrary();
  if (currentView === 'detail') renderDetail();
}
document.addEventListener('click', async event => {
  const recordingButton = event.target.closest('button[data-recording]');
  if (recordingButton) return openRecording(recordingButton.dataset.recording);
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) {
    filter = filterButton.dataset.filter;
    $('#page-title').textContent = { all: 'All recordings', live: 'Live meetings', processing: 'Processing', archived: 'Archived recordings' }[filter];
    for (const button of document.querySelectorAll('[data-filter]')) button.classList.toggle('selected', button === filterButton);
    show('library'); renderLibrary(); return;
  }
  const statusButton = event.target.closest('[data-status]');
  if (statusButton) {
    statusFilter = statusButton.dataset.status;
    for (const button of document.querySelectorAll('[data-status]')) button.classList.toggle('active', button === statusButton);
    renderLibrary(); return;
  }
  const tab = event.target.closest('[data-tab]');
  if (tab) { selectedTab = tab.dataset.tab; renderDetail(); return; }
  const detailAction = event.target.closest('[data-detail-action]');
  if (detailAction) {
    const name = detailAction.dataset.detailAction;
    if (name === 'rename') { $('#rename-title').value = state.recordings.find(item => item.id === selectedId).title; $('#rename-dialog').showModal(); return; }
    detailAction.disabled = true;
    try {
      await api(`/api/recordings/${selectedId}/${name}`);
      if (name === 'stop') toast('Stop requested. Tracks will save after MeetStream finishes processing.');
      if (name === 'retry') toast('Sync queued. Any missing files will be retried.');
    } catch (error) { toast(error.message); }
    finally { detailAction.disabled = false; }
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'new') { $('#form-error').hidden = true; $('#new-dialog').showModal(); }
  if (action === 'close-dialog') $('#new-dialog').close();
  if (action === 'cancel-rename') $('#rename-dialog').close();
  if (action === 'settings') show('settings');
  if (action === 'library') { show('library'); renderLibrary(); }
  if (action === 'reconnect') {
    try { await api('/api/reconnect'); toast('Reconnecting webhooks… Existing meetings can still be synced through the API.'); }
    catch (error) { toast(error.message); }
  }
});
$('#search').addEventListener('input', renderLibrary);
$('#recording-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#send-bot');
  button.disabled = true;
  button.textContent = 'Sending your bot…';
  $('#form-error').hidden = true;
  try {
    const result = await api('/api/recordings', { meetingLink: $('#meeting-link').value, title: $('#meeting-title').value, botName: $('#bot-name').value, live: $('#live-captions').checked });
    $('#new-dialog').close();
    applyState(await (await fetch('/api/state')).json());
    openRecording(result.id);
    toast('Bot sent. Admit it from Google Meet when asked.');
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; }
  finally { button.textContent = 'Send recording bot ↗'; button.disabled = false; }
});
$('#rename-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await api(`/api/recordings/${selectedId}/rename`, { title: $('#rename-title').value }); $('#rename-dialog').close(); }
  catch (error) { toast(error.message); }
});
$('#key-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try { await api('/api/key', { key: $('#api-key').value }); $('#api-key').value = ''; toast('MeetStream connection verified.'); }
  catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});
async function connect() {
  try {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error('Open the launch link printed by the app to reconnect.');
    applyState(await response.json());
    stream = new EventSource('/api/events');
    stream.addEventListener('state', event => applyState(JSON.parse(event.data)));
    stream.addEventListener('error', () => { $('#connection-label').textContent = 'Reconnecting to app…'; });
  } catch (error) { toast(error.message); }
}
connect();
