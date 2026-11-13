import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

// Build only from the checked-in, attributed source snapshots. No network or AI calls.
const read = (name) => JSON.parse(readFileSync(new URL(`../content/learning/${name}`, import.meta.url), 'utf8'))
const medical = read('medmcqa.json')
const biology = read('biology.json')
const localized = read('biology-fa.json')
const translations = new Map(localized.translations.map((q) => [q.id, q]))
const digest = (value) => createHash('sha256').update(value).digest('hex').slice(0, 32)
const groups = new Map()
const clinical = ['preinternship', 'residency']
const basics = ['medical-basics', 'dental-basics', 'bachelor-medicine']
const labels = {
  anatomy: 'آناتومی', physiology: 'فیزیولوژی', biochemistry: 'بیوشیمی', pathology: 'پاتولوژی',
  bacteriology: 'باکتری‌شناسی', 'oral-health': 'سلامت دهان و دندان', internal: 'داخلی', surgery: 'جراحی',
  pediatrics: 'اطفال', gynecology: 'زنان و زایمان', pharmacology: 'فارماکولوژی', epidemiology: 'اپیدمیولوژی',
  radiology: 'رادیولوژی', ophthalmology: 'چشم‌پزشکی', ent: 'گوش، حلق و بینی', orthopedics: 'ارتوپدی',
  dermatology: 'پوست', psychiatry: 'روان‌پزشکی', genetics: 'ژنتیک', histology: 'بافت‌شناسی', biology: 'زیست‌شناسی',
}
const subjects = {
  Anatomy: ['anatomy', basics], Physiology: ['physiology', ['medical-basics', 'bachelor-medicine']],
  Biochemistry: ['biochemistry', basics], Pathology: ['pathology', [...basics, ...clinical]],
  Microbiology: ['bacteriology', basics], Dental: ['oral-health', ['dental-basics']],
  Medicine: ['internal', clinical], Surgery: ['surgery', clinical], Pediatrics: ['pediatrics', clinical],
  'Gynaecology & Obstetrics': ['gynecology', clinical], Pharmacology: ['pharmacology', clinical],
  'Social & Preventive Medicine': ['epidemiology', ['medical-basics', 'bachelor-medicine', ...clinical]],
  Radiology: ['radiology', clinical], Ophthalmology: ['ophthalmology', clinical], ENT: ['ent', clinical],
  Orthopaedics: ['orthopedics', clinical], Skin: ['dermatology', clinical], Psychiatry: ['psychiatry', clinical],
}
const clean = (value) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const add = (provider, track, subject, question) => {
  const key = `${provider}-${track}-${subject}-${question.language}`
  const group = groups.get(key) ?? { provider, track, subject, language: question.language, questions: [] }
  group.questions.push(question)
  groups.set(key, group)
}

for (const row of medical.questions) {
  const [subject, tracks] = subjects[row.subject_name]
  const question = {
    key: row.id, subjectId: subject, chapter: labels[subject], prompt: clean(row.question),
    options: [row.opa, row.opb, row.opc, row.opd].map(clean), correctIndex: row.cop,
    explanation: clean(row.exp), difficulty: 'medium', topic: null, language: 'en',
    source: { name: 'MedMCQA — Pal, Umapathi & Sankarasubbu (2022)', url: 'https://huggingface.co/datasets/openlifescienceai/medmcqa',
      license: 'Apache-2.0', questionId: row.id, revision: medical.sha256 },
  }
  for (const track of tracks) add('medmcqa', track, subject, question)
}

const chapters = {
  3: ['مولکول‌های زیستی', 'biochemistry'], 4: ['ساختار سلول', 'histology'],
  5: ['غشا و جابه‌جایی مواد', 'physiology'], 6: ['متابولیسم', 'biochemistry'],
  7: ['تنفس سلولی', 'biochemistry'], 8: ['فتوسنتز', null], 10: ['چرخهٔ سلولی', 'genetics'],
  11: ['میوز و تولیدمثل جنسی', 'genetics'], 12: ['وراثت مندلی', 'genetics'],
  14: ['ساختار و عملکرد DNA', 'genetics'], 15: ['ژن و پروتئین', 'genetics'],
}
const translated = new Set()
let biologyCount = 0
for (const row of biology.questions) {
  const fa = translations.get(row.id)
  if (fa) translated.add(row.id)
  if (!fa && /�/.test(row.question + row.options.join(''))) continue
  const [chapter, subject] = chapters[row.chapterNumber]
  const question = {
    key: digest(`${row.module}-${row.id}`), subjectId: 'biology', chapter, prompt: fa?.prompt ?? row.question,
    options: fa?.options ?? row.options, correctIndex: row.correctIndex,
    explanation: fa?.explanation ?? `Published solution key: ${String.fromCharCode(65 + row.correctIndex)} — ${row.options[row.correctIndex]}. The source section linked below contains the underlying concepts.`,
    difficulty: 'medium', topic: fa ? localized.topics[String(row.chapterNumber)] : null, language: fa ? 'fa' : 'en',
    source: { name: `OpenStax Biology 2e — Clark, Douglas & Choi${fa ? ' · ترجمه و توضیح فارسی' : ''}`,
      url: `https://github.com/openstax/osbooks-biology-bundle/blob/${biology.revision}/modules/${row.module}/index.cnxml#${row.id}`,
      license: 'CC-BY-4.0', questionId: `${row.module}#${row.id}`, revision: biology.revision },
  }
  biologyCount++
  add('openstax', 'konkur', 'biology', question)
  if (subject) {
    for (const track of basics) {
      if (track === 'dental-basics' && ['genetics', 'physiology'].includes(subject)) continue
      add('openstax', track, subject, { ...question, subjectId: subject })
    }
  }
}
if (translated.size !== translations.size) throw new Error('A translated exercise is missing from the source snapshot.')

const quote = (value) => value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`
const packs = []
for (const [key, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  for (let offset = 0; offset < group.questions.length; offset += 200) {
    const questions = group.questions.slice(offset, offset + 200)
    const part = Math.floor(offset / 200) + 1
    packs.push({ key: `reference-${key}-${part}`, title: `${labels[group.subject]} · ${group.provider === 'medmcqa' ? 'منتخب MedMCQA' : 'تمرین‌های OpenStax'}${group.language === 'fa' ? ' · فارسی' : ''}`,
      track: group.track, bank: 'reference', provider: group.provider, year: null, period: 'منبع باز', availableAt: '2026-11-02T00:00:00.000Z', isSample: false,
      attribution: group.provider === 'medmcqa' ? 'MedMCQA — Pal, Umapathi & Sankarasubbu, 2022. Validation split via Open Life Science AI; Apache-2.0. متن اصلی انگلیسی؛ آزمون رسمی ایران نیست.' : 'Biology 2e — Mary Ann Clark, Matthew Douglas, Jung Choi / OpenStax. CC BY 4.0, نسخهٔ ۲۰ دسامبر ۲۰۲۴. ترجمه و توضیح فارسی در موارد مشخص افزوده شده است؛ سؤال کنکور ایران نیست.',
      questions })
  }
}
let sql = '-- Verified source content; generated by scripts/build-learning-content.mjs.\n-- Original answer keys are preserved. Licenses and provenance are in content/learning and public/licenses.\n'
for (const pack of packs) {
  sql += `INSERT INTO learning_packs (id,title,track,bank,provider,year,period,available_at,is_sample,attribution,created_at) VALUES (${[pack.key, pack.title, pack.track, pack.bank, pack.provider, null, pack.period, Date.parse(pack.availableAt), 0, pack.attribution, Date.parse(pack.availableAt)].map(quote).join(',')});\n`
  const rows = pack.questions.map((q) => `(${[digest(`${pack.key}-${q.key}`), pack.key, q.subjectId, q.chapter, q.difficulty, JSON.stringify(q)].map(quote).join(',')})`)
  const prefix = 'INSERT INTO learning_questions (id,pack_id,subject_id,chapter,difficulty,content) VALUES\n'
  let batch = []
  let bytes = Buffer.byteLength(prefix)
  for (const row of rows) {
    const rowBytes = Buffer.byteLength(row) + 2
    if (bytes + rowBytes > 60000 && batch.length) {
      sql += `${prefix}${batch.join(',\n')};\n`
      batch = []
      bytes = Buffer.byteLength(prefix)
    }
    batch.push(row)
    bytes += rowBytes
  }
  if (batch.length) sql += `${prefix}${batch.join(',\n')};\n`
}
sql += "UPDATE system_metadata SET value = '9', updated_at = unixepoch() WHERE key = 'schema_version';\n"
writeFileSync(new URL('../migrations/0009_verified_learning_content.sql', import.meta.url), sql)
const manifest = { sourceQuestions: medical.questions.length + biologyCount, medicalQuestions: medical.questions.length, biologyQuestions: biologyCount, persianTranslations: translated.size,
  packs: packs.length, questionPlacements: packs.reduce((sum, p) => sum + p.questions.length, 0), tracks: Object.fromEntries([...new Set(packs.map((p) => p.track))].map((track) => [track, packs.filter((p) => p.track === track).reduce((sum, p) => sum + p.questions.length, 0)])),
  sourceHashes: { medmcqaParquet: medical.sha256, biologyRevision: biology.revision } }
writeFileSync(new URL('../content/learning/manifest.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify(manifest, null, 2))
