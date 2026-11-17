# Learning and exam hub

The authenticated `/learn` route adds question practice to the existing study tracker. Navigation includes Learning on desktop and mobile; Friends remains available from the sidebar and the mobile profile shortcuts. Score tracking also appears on `/me`.

## Delivered features

- Nine study tracks, including separate experimental sciences, mathematics, and humanities Konkur tracks. Medical and pharmacy tracks have their own subject catalogs.
- National, authored, open-reference, and weekly banks with filters for subject, chapter, difficulty, source, Persian exam year, period, booklet, and personal question pools. School tracks also offer 10th, 11th, 12th, and Konkur filters. An empty subject or chapter selection includes everything within the other active filters.
- Educational practice reveals feedback after submitting each answer and then locks it. Exam mode allows changes and withholds answer keys, explanations, and statistics until completion. Server-owned scoring uses `(3 × correct − wrong) / (3 × total) × 100`. Unanswered questions count as blanks.
- Attempts persist on the server and have deep links. The review/history page offers recovery of unfinished attempts and the 50 most recent attempts. Completing an attempt is idempotent and schedules its questions for review.
- Review starts with a one-day interval, doubles subsequent correct intervals to a maximum of 60 days, and resets a wrong or blank answer to one day. The due queue uses server time. Latest mistakes use each question's latest completed response.
- Answer explanations, difficulty, related structured mind maps, important points, and optional micro-lessons. Topic cards link to up to five exact related questions. Topics paginate in groups of 24. Content comes from the imported educational material rather than being silently generated.
- Private saved questions, notes, and explanation highlights. Highlights must be literal excerpts from the explanation. Notebook filters separate saved questions, highlights, and notes.
- Performance by subject and completed exam totals. Community counts use each participant's most recent completed response once per question; they are not invented seed statistics.
- Manually entered exam scores, source-specific means, chronological trends, notes, and links to AI analysis. Different providers' score scales are displayed separately.
- Personal preparation packs for Maz, Ghalamchi, Gaj, Konkuri Nerd, national exams, or other sources. Selected subjects receive learning, practice, due-review, and mock-exam steps with persistent checkboxes and links to the corresponding tools.
- Real AI Q&A and exam/score analysis with private message history, owned context, a per-user hourly request cap, and explicit unavailable/error states. There is no simulated AI response when a provider is missing.
- Studio JSON import with local validation, preview, subject checks, attribution, publication scheduling, and archival. Imported content is immutable so an answer key cannot change underneath an existing attempt. Import a corrected version under a new key and archive the old version.

## Database and samples

Migration `0010_persian_learning_content.sql` publishes 445 native Persian exam questions and 24 Persian textbook adaptations across 33 collections. It archives the earlier English packs and preserves previous attempts. National questions keep their answer keys and original figures or scans, which appear inline. Rebuild that snapshot with `npm run content:build:persian`.

Migration `0013_learning_grades_statistics.sql` adds 46 original Persian statistics, probability, and counting exercises with worked solutions. Some exercises are shared across school tracks, for 57 placements in 12 collections. The curriculum topics follow the Iranian school syllabi, including [10th-grade mathematics](https://www.roshd.ir/riazi/Content/%DA%A9%D8%AA%D8%A7%D8%A8-%D8%B1%DB%8C%D8%A7%D8%B6%DB%8C-1-%D9%BE%D8%A7%DB%8C%D9%87-%D8%AF%D9%87%D9%85), [11th-grade statistics and probability](https://www.roshd.ir/riazi/Content/%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A2%D9%85%D8%A7%D8%B1-%D9%88-%D8%A7%D8%AD%D8%AA%D9%85%D8%A7%D9%84-%D9%BE%D8%A7%DB%8C%D9%87-%DB%8C%D8%A7%D8%B2%D8%AF%D9%87%D9%85-%D8%B1%D8%B4%D8%AA%D9%87-%D8%B1%DB%8C%D8%A7%D8%B6%DB%8C-%D9%88-%D9%81%DB%8C%D8%B2%DB%8C%DA%A9), and [12th-grade humanities mathematics](https://www.roshd.ir/riazi/Content/%DA%A9%D8%AA%D8%A7%D8%A8-%D8%B1%DB%8C%D8%A7%D8%B6%DB%8C-%D9%88-%D8%A2%D9%85%D8%A7%D8%B1-3-%D9%BE%D8%A7%DB%8C%D9%87-%D8%AF%D9%88%D8%A7%D8%B2%D8%AF%D9%87%D9%85).

Apply `npm run db:migrate:local` for local development. Migration `0008_learning_hub.sql` adds the learning tables, account-deletion cascades, query indexes, and schema version 8. Apply the same migration through the existing deployment workflow before deploying the new Worker remotely.

Migration 8 includes ten original, explicitly labelled sample questions: five Konkur cell-biology questions and five basic-science biochemistry questions. Samples are excluded from practice and topic libraries unless the learner enables them. Migration 10 adds the Persian library described above. Publisher weekly papers and historical community statistics are not included.

## Importing real material and weekly publication

Use **Studio → مدیریت محتوای یادگیری → ورود و پیش‌نمایش بستهٔ سؤال**. A downloadable, validated example is available at `/examples/learning-pack.json`. Each import accepts up to 200 questions and 3 MB; split larger exams into multiple booklets. IDs in `key` must be unique. The subject IDs are defined in `src/shared/lib/learning-catalog.ts`.

Every question requires four options, a zero-based `correctIndex`, an explanation, a subject, a chapter, and a difficulty. A `topic` may contain a title, important points, a short lesson, and mind-map branches, or be `null`. School packs can specify `grade` as `grade-10`, `grade-11`, `grade-12`, or `konkur`; omit it when a pack spans topics without a grade label.

For weekly releases use `bank: "weekly"`, a provider such as `maz`, `ghalamchi`, or `gaj`, and a future UTC ISO `availableAt`. Several future weeks can be imported in advance. The server exposes a pack only once its publication time arrives and it is active; no cron is needed for this visibility rule. Studio scheduling controls display Tehran time. `year` denotes the Persian exam year, while date input fields explicitly use Gregorian dates and display Persian calendar summaries.

Actual official/publisher questions and ongoing weekly acquisition still require authorized content or a connected feed. This implementation does not scrape or fetch publisher exams automatically. Once material is supplied, import it through Studio or the admin-only `/api/admin/learning/import` endpoint. The `attribution` field records provenance and is displayed with the booklet.

## Enabling AI

The Worker accepts an optional Cloudflare Workers AI binding named `AI`. Add `"ai": { "binding": "AI" }` to the intended environment in Wrangler configuration, then redeploy using the existing deployment process. Environment bindings are not inherited; configure the selected environment explicitly. The implementation invokes `@cf/meta/llama-3.1-8b-instruct` through `env.AI.run` with server-assembled educational context. See the [official binding documentation](https://developers.cloudflare.com/workers-ai/configuration/bindings/).

No AI binding is enabled locally, so local testing makes no billable inference calls. The production environment has the `AI` binding enabled. Workers AI calls use the Cloudflare account. The UI identifies a missing service and disables submission in unconfigured environments. Tests exercise the provider boundary with a test double; a live model response has not been exercised.

Exam analysis includes aggregate results, per-subject totals, and up to twelve mistakes with excerpts, with the number of omitted mistakes explicitly included. Score analysis includes only the user's selected record; it cannot infer subject mastery from a score without details. An unfinished exam cannot be sent for analysis or have its attached answer key sent through question Q&A.

## Validation

`worker/learning/learning.test.ts` runs the actual migrations and service SQL against isolated in-memory SQLite databases through a D1 adapter. Coverage includes publication/archival, imports, all filters, server-side grading and answer concealment, account isolation, attempt recovery and locks, idempotent completion, review intervals, notebook highlights, preparation checklists, scores, and AI ownership/availability/rate limits. Domain tests cover negative marks and the subject catalogs. Existing suites remain part of the full validation run.

Local browser checks cover starting practice, submitting feedback, reading mind maps, saving notes, finishing and grading, notebook persistence, preparation progress, score averages, and the unavailable AI handoff. The learning and notebook layouts have been inspected at a mobile viewport as well as desktop.
