// Local-only showcase data: a ready-to-use demo login with five weeks of study
// history, subjects, planner items, and a small circle of study friends (two of
// them studying "live" right now). Every write targets Wrangler's local D1
// emulator through the hard-coded --local flag; it can never touch a remote
// database. Rerunning replaces the previous demo data and refreshes the
// timeline to today.
//
//   npm run demo:seed
//   DEMO_EMAIL=me@example.test DEMO_PASSWORD='my-long-password' npm run demo:seed
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { hashPassword } from 'better-auth/crypto'

const email = (process.env.DEMO_EMAIL ?? 'demo@sweetstudy.test').trim().toLowerCase()
const password = process.env.DEMO_PASSWORD ?? 'sweet-study-demo'
if (!/^[^\s'"@]+@[^\s'"@]+\.[^\s'"@]+$/.test(email)) throw new Error('DEMO_EMAIL must be a plain email address.')
if (password.length < 10 || password.length > 128) throw new Error('DEMO_PASSWORD must be 10-128 characters.')

// Deterministic randomness keeps the showcase identical between runs.
let seed = 20261112
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (list) => list[Math.floor(random() * list.length)]
const between = (min, max) => Math.round(min + random() * (max - min))
const sql = (value) => value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`

const TEHRAN_OFFSET = 3.5 * 3600_000
const now = Date.now()
const tehranDate = (ms) => new Date(ms + TEHRAN_OFFSET).toISOString().slice(0, 10)
const tehranDayStart = (ms) => Date.parse(`${tehranDate(ms)}T00:00:00Z`) - TEHRAN_OFFSET
const today = tehranDayStart(now)
const day = 86_400_000

const userId = 'demo-user'
const subjects = [
  ['زیست‌شناسی', '#2f8f6b', '🧬'],
  ['شیمی', '#3b6ab4', '⚗️'],
  ['فیزیک', '#c27c1b', '⚡'],
  ['ریاضی', '#7860a6', '📐'],
  ['ادبیات فارسی', '#bd5555', '📚'],
  ['زبان انگلیسی', '#1f8a9e', '🌍'],
]
const notes = ['فصل ژنتیک را تمام کردم', 'تست‌های ترکیبی سخت بود', 'مرور خلاصه‌ها', 'دو بار اشتباه محاسباتی', 'عالی پیش رفت', null, null, null]

const statements = []
const add = (text) => statements.push(text)

// Clear the previous demo graph. Cascades remove its sessions and accounts.
add(`DELETE FROM active_study_timers WHERE log_id LIKE 'demo-%';`)
add(`DELETE FROM study_logs WHERE id LIKE 'demo-%';`)
add(`DELETE FROM "user" WHERE id = ${sql(userId)} OR id LIKE 'demo-friend-%' OR email = ${sql(email)};`)

const iso = new Date(now - 40 * day).toISOString()
add(`INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt, role, theme) VALUES (${sql(userId)}, 'نیلوفر', ${sql(email)}, 1, NULL, ${sql(iso)}, ${sql(iso)}, 'admin', 'system');`)
add(`INSERT INTO account (id, issuer, accountId, providerId, userId, password, createdAt, updatedAt) VALUES ('demo-account', 'local:credential', ${sql(userId)}, 'credential', ${sql(userId)}, ${sql(await hashPassword(password))}, ${sql(iso)}, ${sql(iso)});`)

const konkur = tehranDate(now + 196 * day)
add(`INSERT INTO user_settings (user_id, friend_code, bio, daily_goal_minutes, konkur_date, timer_display, chibi_scene, education_group, education_stage, study_goals, music_links, updated_at) VALUES (${sql(userId)}, 'NILOO2026', 'پشت کنکوری تجربی؛ هر روز کمی بهتر 🌱', 240, ${sql(konkur)}, 'chibi', 'rainy-window', 'school', 'tajrobi', 'exam,habit,focus', ${sql(JSON.stringify([{ id: 'demo-lofi', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', title: 'لوفای برای مطالعه' }]))}, ${now});`)
subjects.forEach(([name, color, emoji], index) => add(`INSERT INTO user_subjects (id, user_id, name, color, emoji, position, created_at) VALUES ('demo-subject-${index}', ${sql(userId)}, ${sql(name)}, ${sql(color)}, ${sql(emoji)}, ${index}, ${now});`))

let logIndex = 0
function studyLog(owner, start, minutes, { mode = pick(['free', 'free', 'pomodoro']), subject = pick(subjects)[0], open = false } = {}) {
  const id = `demo-log-${logIndex++}`
  const tests = random() < 0.55 ? between(10, 45) : 0
  const correct = tests ? Math.round(tests * (0.45 + random() * 0.45)) : 0
  const wrong = tests ? Math.round((tests - correct) * (0.3 + random() * 0.5)) : 0
  const end = open ? null : start + minutes * 60_000
  const pomodoro = mode === 'pomodoro'
  add(`INSERT INTO study_logs (id, user_id, mode, subject_name, scheduled_session_id, started_at, ended_at, duration_seconds, focus_lock_enabled, created_at, updated_at, test_count, note, pomodoro_focus_minutes, pomodoro_break_minutes, pomodoro_long_break_minutes, pomodoro_rounds, tests_correct, tests_wrong, focus_rating) VALUES (${sql(id)}, ${sql(owner)}, ${sql(mode)}, ${sql(subject)}, NULL, ${start}, ${end ?? 'NULL'}, ${open ? 'NULL' : minutes * 60}, 0, ${start}, ${end ?? start}, ${open ? 0 : tests}, ${sql(open ? null : pick(notes))}, ${pomodoro ? 25 : 'NULL'}, ${pomodoro ? 5 : 'NULL'}, ${pomodoro ? 15 : 'NULL'}, ${pomodoro ? 4 : 'NULL'}, ${open ? 0 : correct}, ${open ? 0 : wrong}, ${open ? 'NULL' : between(3, 5)});`)
  return id
}

// Five weeks with a rising trend, two rest days, and a current 9-day streak.
for (let offset = 34; offset >= 1; offset--) {
  if (offset === 17 || offset === 10) continue
  const dayStart = today - offset * day
  const sessions = between(2, offset < 12 ? 6 : 4)
  let cursor = dayStart + between(8, 10) * 3600_000
  for (let index = 0; index < sessions; index++) {
    const minutes = between(30, offset < 12 ? 95 : 70)
    studyLog(userId, cursor, minutes)
    cursor += (minutes + between(15, 70)) * 60_000
    if (cursor > dayStart + 23 * 3600_000) break
  }
}
// Today: a good start that leaves the goal ring partly filled. Sessions end
// before "now" so the demo never shows future study.
const todayElapsedMinutes = Math.floor((now - today) / 60_000)
let cursor = today + Math.min(8 * 60, Math.max(0, todayElapsedMinutes - 200)) * 60_000
for (const [minutes, subject] of [[55, 'زیست‌شناسی'], [40, 'شیمی'], [50, 'ریاضی']]) {
  if (cursor + minutes * 60_000 > now - 5 * 60_000) break
  studyLog(userId, cursor, minutes, { subject })
  cursor += (minutes + 20) * 60_000
}

// Planner: today and tomorrow, part done.
const plans = [
  [0, 'task', 'مرور فصل ۶ زیست (تنفس سلولی)', 'زیست‌شناسی', 60, 40, 1],
  [0, 'task', '۴۰ تست شیمی آلی', 'شیمی', 45, 40, 1],
  [0, 'task', 'حل تمرین‌های حد و پیوستگی', 'ریاضی', 50, null, 0],
  [0, 'note', 'قبل از خواب: یک ساعت آرام', null, null, null, 0],
  [1, 'task', 'آزمون جامع شبیه‌سازی', 'زیست‌شناسی', 180, 120, 0],
  [1, 'task', 'لغت‌های درس ۳ زبان', 'زبان انگلیسی', 30, null, 0],
  [2, 'task', 'تحلیل آزمون و رفع اشکال', 'فیزیک', 90, null, 0],
]
plans.forEach(([offset, kind, title, subject, minutes, tests, done], index) => {
  add(`INSERT INTO planner_items (id, user_id, plan_date, kind, title, details, subject_name, planned_minutes, planned_tests, is_done, remind_at, position, created_at, updated_at) VALUES ('demo-plan-${index}', ${sql(userId)}, ${sql(tehranDate(today + offset * day + 12 * 3600_000))}, ${sql(kind)}, ${sql(title)}, NULL, ${sql(subject)}, ${minutes ?? 'NULL'}, ${tests ?? 'NULL'}, ${done}, NULL, ${index}, ${now}, ${now});`)
})

// Study friends: three online, two of them in a session right now.
const friends = [['سارا', 'زیست‌شناسی', 'running'], ['آرین', 'فیزیک', 'running'], ['مریم', 'شیمی', null], ['نیما', 'ریاضی', null], ['یاسمن', 'ادبیات فارسی', null]]
friends.forEach(([name, subject, live], index) => {
  const id = `demo-friend-${index + 1}`
  add(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt, role, theme) VALUES (${sql(id)}, ${sql(name)}, ${sql(`${id}@example.invalid`)}, 1, ${sql(iso)}, ${sql(iso)}, 'member', 'system');`)
  add(`INSERT INTO user_settings (user_id, friend_code, live_visibility, updated_at) VALUES (${sql(id)}, ${sql(`DEMOF${index + 1}XYZ`)}, 'friends', ${now});`)
  const [low, high] = [userId, id].sort()
  add(`INSERT INTO friendships (user_low, user_high, requested_by, status, created_at, updated_at) VALUES (${sql(low)}, ${sql(high)}, ${sql(id)}, 'accepted', ${now}, ${now});`)
  if (index < 3) add(`INSERT INTO user_presence (user_id, last_seen_at) VALUES (${sql(id)}, ${now});`)
  for (let offset = 6; offset >= 0; offset--) {
    if (offset === 0 && !live) continue
    const sessions = between(1, 4 - (index % 2))
    for (let session = 0; session < sessions; session++) studyLog(id, today - offset * day + (9 + session * 3) * 3600_000, between(35, 110), { subject })
  }
  if (live) {
    const started = now - between(18, 52) * 60_000
    const logId = studyLog(id, started, 0, { mode: 'free', subject, open: true })
    add(`INSERT INTO active_study_timers (user_id, log_id, timer_status, current_segment_started_at, paused_at, accumulated_seconds, version, last_command_id, updated_at) VALUES (${sql(id)}, ${sql(logId)}, 'running', ${started}, NULL, 0, 1, 'demo-seed', ${now});`)
  }
})

const directory = resolve('node_modules/.tmp/demo')
mkdirSync(directory, { recursive: true })
const file = resolve(directory, 'seed-demo.sql')
writeFileSync(file, statements.join('\n'))

const result = spawnSync(process.execPath, [resolve('scripts/run-wrangler.mjs'), 'd1', 'execute', 'DB', '--local', `--file=${file}`], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
console.log(`\nDemo data ready (${statements.length} statements). Sign in locally as ${email}.`)
console.log('The password is DEMO_PASSWORD, or the default documented in README.md.')
