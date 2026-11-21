# Performance audit — 2026-10-15

The largest avoidable costs were an entire icon catalog in development, repeated audio sample generation, broad rendering updates, animated blur surfaces, eager feature dependencies, and full-history analytics reads.

| Measurement | Before | After |
| --- | ---: | ---: |
| Development Lucide JavaScript, all used icons plus shared icon helper | 1,133,333 bytes | 57,391 bytes |
| Onboarding illustration, same 1536 × 1024 dimensions | 1,982,826 bytes PNG | 97,268 bytes WebP |
| Welcome JavaScript graph | 473,611 bytes | approximately 389,000 bytes |
| Welcome graph, each file gzipped | 152,766 bytes | approximately 124,000 bytes |
| Client build modules transformed | 2,053 | approximately 381 |
| CSS | 93,972 bytes | 92,907 bytes |

The welcome graph includes the built entry, App, Welcome, and their static imports, deduplicated by file. It excludes other lazy routes and the asynchronous service-worker bootstrap. These are output-size measurements, not browser transfer or frame-rate measurements. Total JavaScript across every route remains approximately 810 KB, including the existing on-demand html2canvas export chunk; moving work behind feature boundaries primarily reduces startup work.

## What changed

- Vite rewrites named Lucide imports to individual icons and prebundles only the icons used in source. Aliases are resolved from the installed package, including renamed legacy icons. Existing application imports and TypeScript types stay intact. This depends on the package's ESM distribution layout; import tests and the normal build catch incompatible package updates.
- Workbox/PWA tooling loads only for production builds. The Cloudflare runtime still starts for real local API and D1 behavior. Tests avoid importing both toolchains. Tailwind scans explicit UI sources, and Vite ignores local emulator and editor state.
- Welcome, introduction, auth, shell, and background services load separately. API schemas load after sign-in when needed. Importing the common API error class no longer imports the legacy API client and unrelated contracts. Auth's static background no longer imports the full authenticated navigation shell.
- The focus clock owns one-second updates. The SVG scene is memoized, paused free-study displays stop ticking, and visible clocks stop while hidden and catch up immediately on return.
- Large animated, blurred background circles became static radial gradients. Repeated glass-card backdrop filters were removed; semantic palette colors and focus-room animation remain.
- Fireplace crackles share one pink-noise buffer. A minute of playback creates two noise buffers instead of roughly 334. One-shot audio nodes disconnect when finished, scene changes stop unfinished notes, and switching sound off suspends the AudioContext.
- Reminder and Pomodoro notifications use deadlines instead of a five-second React polling loop. Timer polling has one app-wide owner, presence polling stops while hidden, toast timers are cleaned up, and StrictMode no longer duplicates initial presence writes and toast deliveries. Reminder deadlines still operate in hidden tabs, subject to browser throttling.
- Closed study setup dialogs do not fetch subjects/settings. Planner grouping reuses cached groups without repeatedly copying arrays. Admin search waits 250 ms after typing before querying.
- Period statistics fetch only current/previous period logs. Heatmaps aggregate by date within their requested window. Lifetime XP and badge facts come from database aggregates; streaks use daily rows, and Study DNA reads at most 24 hourly rows. Removing the old 20,000-row cutoff also prevents recent sessions from disappearing after a large history.

## Verification and budgets

`npm run validate` checks lint, TypeScript, 64 tests, the production Worker/PWA build, secret-free deployment artifacts, and size budgets. The added behavior checks cover hundreds of audio crackles and audio disposal, hidden/paused clocks, icon aliases/types, Tehran midnight, cross-user isolation, unfinished timers, and histories larger than 20,000 sessions.

The local browser smoke test covered sign-in, starting/pausing/resuming/completing a session, the focus room, Chibi display, fireplace sound, and the progress screen. Thirteen real local API endpoints were checked, including day/week/month statistics, heatmap, gamification, Study DNA, social, and shop reads.

After `npm run build`, run `npm run perf:report` to reproduce the size measurements. `npm run check:performance` enforces budgets of 430 KB welcome JavaScript, 140 KB gzipped welcome JavaScript, 170 KB CSS, and 150 KB onboarding imagery.

The CSS budget moved from 100 KB to 135 KB with the November 2026 experience layer (`src/styles/experience.css`): motion tokens, page and navigation transitions, bottom sheets, toasts, the command palette, the focus-room backdrop and celebration styles. The measured stylesheet is about 138 KB raw. The budget moved again, from 135 KB to 150 KB, with the onboarding, Today live strip, draggable focus dock, music player, mood faces and tablet layouts (November 2026). It moved to 170 KB for the planner notebook sheets; their 15 KB stylesheet is a separate chunk loaded only when the notebook opens, but the budget counts every CSS file. The Estedad variable font and Lalezar (`woff2` subsets loaded by `unicode-range`) are self-hosted and precached by the service worker; fonts are not counted in these budgets. The confirmation dialog, celebration and background services are lazy so the account-entry bundle stays near 403 KB. These checks also run in CI through `validate`.

Client build time fell from a recorded 4.39 seconds to about 1 second on this machine. Cache state and other running tools affect that number; it is not a controlled cold-start benchmark. Device-level frame rate, peak browser heap, and low-end mobile performance were not measured. React development checks and the integrated Worker runtime remain enabled. The installed Node runtime was 22.16.0 during this audit; the repository pins 22.19.x in `.nvmrc`.

The approach follows [Vite's performance guidance](https://vite.dev/guide/performance), [dependency prebundling guidance](https://vite.dev/guide/dep-pre-bundling), and [Tailwind's explicit source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).
