# Build progress (agent working notes, not product docs)

Goal: full PWA product per the user's notes; all features on Worker + D1, Supabase removed.
Rule: tiny turns (<=3 tool calls, files <200 lines per write).

- [x] S1 migrations 0004 (settings, parts, overrides, pomodoro/test cols, planner) + 0005 (friends, blocks, invites, presence, badges, shop, entitlements, plan_requests, broadcasts); ready check expects '5'
- [x] S1v npm ci for Windows (node_modules was Linux/WSL) then `npm run db:migrate:local` (0004-0006 applied)
- [x] S2 worker/study-timer commands: start/pause/resume/stop + pomodoro phase, idempotent, versioned; logs list; shared contracts
- [x] S3 settings + friend_code, study parts/today schedule, overrides, planner CRUD (routes/study.ts)
- [x] S4 analytics, XP/levels/badges seen-state, Study DNA (src/shared/lib/analytics.ts, gamification.ts, routes/progress.ts)
- [x] S5 friends, presence, live list, ranking, cheers (worker/social/*, routes/social.ts) - typecheck green
- [x] S6 shop catalog, orders (dev provider), entitlements, Plan by Asal requests, admin (routes/shop.ts, routes/admin.ts) - worker typecheck green, 54/55 tests (client.test.ts timer fixture is stale -> fix in S7)
- [x] S7 web auth on Better Auth (signup/login/logout), local dev seed + admin (ADMIN_EMAILS + first local user), new App.tsx router + AppShell; app typecheck green. Pages are stubs in src/pages/*. Leftover: fix client.test.ts timer fixture (S12)
  - page build order: HomePage (timer card, today parts, goal ring, streak, countdown, broadcasts) -> FocusPage (digital/chibi, pomodoro, ambient) -> PlannerPage -> ProgressPage -> FriendsPage(+live) -> RankingPage -> MePage(settings, subjects, badges, DNA, export) -> ShopPage -> AdminPage -> InvitePage; BackgroundServices (presence heartbeat, cheers toast, reminders, pomodoro notifications)
  - done: src/shared/api/http.ts (validated fetch). TODO: src/app/api.ts endpoint map; Persian message map for error codes; auth client (/api/auth/sign-up/email, sign-in/email, sign-out, get-session); fix client.test.ts timer fixture
  - done: api.ts, auth.ts, session.ts, routes.ts, navigation/items.ts, BottomNavigation, Sidebar, Avatar, AppShell, useTheme. TODO: @keyframes float in index.css; new Auth screen on auth.ts; new App.tsx router (session gate, lazy pages, invite route); dev admin seed (first local user = admin); typecheck
- [x] S8 timer UI: 3 modes, subject, digital/chibi lofi display, pomodoro, focus room (useStudyTimer, StartStudySheet, ActiveTimerCard, FinishSessionSheet, TodayParts, HomePage, FocusPage). Notifications -> BackgroundServices (S10)
- [x] S9 progress, planner, export/share card, badges, DNA pages on API
- [x] S10 profile/settings, friends, live, ranking on API
- [x] S11 shop, Plan by Asal, admin panel on API
- [x] S12 remove Supabase, PWA icons/manifest, validate, docs, commit on hesam-dev
  - done: supabase-js removed, legacy screens deleted, env cleaned, lint 0/0, tests 55/55, `npm run build` green (PWA precache 47 entries). TODO: uninstall unused jspdf; 192/512 maskable PNG icons + manifest (name, fa, rtl, theme color, shortcuts); README/ROADMAP update; `npm run validate`; final commit

## Added features (user asked to ideate + add)
- [x] F1 Konkur-style test tracking: correct/wrong/blank per session -> درصد with negative marking (3 wrong cancels 1 correct); migration 0006 adds tests_correct, tests_wrong, focus_rating
- [x] F2 Session reflection: focus rating 1-5 + note after stop; shown in progress
- [x] F3 Daily goal ring + streak flame on home; konkur countdown (date in settings)
- [x] F4 Ambient sound player in focus/chibi mode (rain, cafe, fire, lofi) via WebAudio-generated noise, no external assets
- [x] F5 Chibi Asal SVG scene: day/night from Tehran clock, rain/snow variants, breathing/typing animation, cat
- [x] F6 Cheers: send a 💖 cheer to a studying friend (rate limited), shown as toast
- [x] F7 Weekly league leaderboard (opt-in) + personal bests
- [x] F8 Subjects with colors/emoji managed in settings; used in charts and timer

## Design direction ("premium")
Glassy cards on soft gradient, Vazirmatn, rounded-3xl, subtle motion, dark mode first-class, RTL, bottom tab bar on mobile + sidebar on desktop, skeletons + empty states, Chibi accents.
