import type { Track } from '../api/learning'

/**
 * Who the learner is. The education profile decides which learning tracks,
 * exam countdown, default subjects and AI context fit them, so a medical
 * student never sees Konkur religion classes and a Konkur student never sees
 * residency exams.
 */
export type EducationGroup = 'school' | 'medicine' | 'dentistry' | 'bachelor-medicine' | 'pharmacy' | 'other'

type SubjectSeed = { name: string; emoji: string; color: string }
type Stage = { id: string; label: string; hint?: string; exam: string | null; tracks: Track[]; subjects: SubjectSeed[] }
type Group = { id: EducationGroup; label: string; emoji: string; hint: string; stageQuestion: string; stages: Stage[] }

const palette = ['#2f8f6b', '#3b6ab4', '#c27c1b', '#7860a6', '#bd5555', '#1f8a9e', '#a8578e', '#5f7d2c']
const seeds = (items: Array<[string, string]>): SubjectSeed[] => items.map(([name, emoji], index) => ({ name, emoji, color: palette[index % palette.length] ?? '#2f8f6b' }))

const general: Array<[string, string]> = [['ادبیات فارسی', '📚'], ['عربی', '📖'], ['دین و زندگی', '🌱'], ['زبان انگلیسی', '🔤']]
const basicSciences = seeds([['آناتومی', '🦴'], ['فیزیولوژی', '🫀'], ['بیوشیمی', '🧪'], ['بافت‌شناسی', '🔬'], ['ایمنی‌شناسی', '🛡️'], ['میکروب‌شناسی', '🦠'], ['ژنتیک', '🧬'], ['انگل‌شناسی', '🪱']])
const clinical = seeds([['داخلی', '🩺'], ['جراحی', '🔪'], ['اطفال', '🧸'], ['زنان', '🌷'], ['فارماکولوژی', '💊'], ['پاتولوژی', '🔬'], ['عفونی', '🦠'], ['روان‌پزشکی', '💬']])

export const educationGroups: Group[] = [
  {
    id: 'school', label: 'دانش‌آموز یا کنکوری', emoji: '🎒', hint: 'دبیرستان، پشت کنکور یا آمادگی کنکور', stageQuestion: 'رشته‌ات چیست؟',
    stages: [
      { id: 'tajrobi', label: 'تجربی', exam: 'کنکور تجربی', tracks: ['konkur'], subjects: seeds([['زیست‌شناسی', '🌿'], ['شیمی', '🧪'], ['فیزیک', '⚛️'], ['ریاضی', '📐'], ['زمین‌شناسی', '🌍'], ...general]) },
      { id: 'riazi', label: 'ریاضی', exam: 'کنکور ریاضی', tracks: ['konkur-math'], subjects: seeds([['ریاضی', '📐'], ['فیزیک', '⚛️'], ['شیمی', '🧪'], ['هندسه', '📏'], ['گسسته', '🔢'], ...general]) },
      { id: 'ensani', label: 'انسانی', exam: 'کنکور انسانی', tracks: ['konkur-humanities'], subjects: seeds([['ادبیات اختصاصی', '✒️'], ['عربی اختصاصی', '📖'], ['ریاضی و آمار', '📊'], ['اقتصاد', '💹'], ['تاریخ و جغرافیا', '🗺️'], ['جامعه‌شناسی', '👥'], ['فلسفه و منطق', '💭'], ['روان‌شناسی', '🧠'], ['دین و زندگی', '🌱'], ['زبان انگلیسی', '🔤']]) },
    ],
  },
  {
    id: 'medicine', label: 'دانشجوی پزشکی', emoji: '🩺', hint: 'از علوم پایه تا رزیدنتی', stageQuestion: 'الان در کدام مقطع هستی؟',
    stages: [
      { id: 'basic-sciences', label: 'علوم پایه', exam: 'آزمون علوم پایه', tracks: ['medical-basics'], subjects: basicSciences },
      { id: 'physiopath', label: 'فیزیوپات', exam: 'آزمون پره‌انترنی', tracks: ['preinternship'], subjects: clinical },
      { id: 'extern', label: 'استاجری', exam: 'آزمون پره‌انترنی', tracks: ['preinternship'], subjects: clinical },
      { id: 'intern', label: 'اینترنی', hint: 'پره‌انترنی یا آزمون تخصص', exam: 'آزمون پره‌انترنی / دستیاری', tracks: ['preinternship', 'residency'], subjects: clinical },
      { id: 'resident', label: 'رزیدنتی', exam: 'آزمون‌های دستیاری تخصصی', tracks: ['residency'], subjects: clinical },
    ],
  },
  {
    id: 'dentistry', label: 'دانشجوی دندان‌پزشکی', emoji: '🦷', hint: 'آزمون علوم پایه دندان‌پزشکی', stageQuestion: 'الان در کدام مقطع هستی؟',
    stages: [{ id: 'basic-sciences', label: 'علوم پایه', exam: 'آزمون علوم پایه دندان‌پزشکی', tracks: ['dental-basics'], subjects: seeds([['آناتومی', '🦴'], ['بافت‌شناسی', '🔬'], ['بیوشیمی', '🧪'], ['فیزیولوژی', '🫀'], ['میکروب‌شناسی', '🦠'], ['ایمنی‌شناسی', '🛡️'], ['آناتومی دندان', '🦷'], ['پاتولوژی', '🔬']]) }],
  },
  {
    id: 'bachelor-medicine', label: 'لیسانس به پزشکی', emoji: '🎓', hint: 'آمادگی آزمون لیسانس به پزشکی', stageQuestion: 'مسیرت',
    stages: [{ id: 'candidate', label: 'داوطلب آزمون', exam: 'آزمون لیسانس به پزشکی', tracks: ['bachelor-medicine'], subjects: seeds([['بیوشیمی', '🧪'], ['فیزیولوژی', '🫀'], ['آناتومی', '🦴'], ['ژنتیک', '🧬'], ['بافت‌شناسی', '🔬'], ['ایمنی‌شناسی', '🛡️'], ['استدلال و تفکر نقاد', '💡'], ['زبان انگلیسی', '🔤']]) }],
  },
  {
    id: 'pharmacy', label: 'دانشجوی داروسازی', emoji: '💊', hint: 'آزمون ۱۸۰ واحدی و پایان دوره', stageQuestion: 'برای کدام آزمون می‌خوانی؟',
    stages: [
      { id: 'exam-180', label: 'آزمون ۱۸۰ واحدی', exam: 'آزمون ۱۸۰ واحدی', tracks: ['pharmacy'], subjects: seeds([['شیمی دارویی', '⚗️'], ['فارماسیوتیکس', '💊'], ['فارماکوگنوزی', '🌿'], ['بیوشیمی', '🧪'], ['میکروب‌شناسی', '🦠'], ['فیزیولوژی', '🫀'], ['ایمنی‌شناسی', '🛡️'], ['شیمی تجزیه', '🔬']]) },
      { id: 'final', label: 'آزمون پایان دوره', exam: 'آزمون پایان دوره داروسازی', tracks: ['pharmacy'], subjects: seeds([['فارماکولوژی', '💊'], ['فارماکوتراپی', '🩺'], ['سم‌شناسی', '☠️'], ['فارماسیوتیکس', '🧴'], ['شیمی دارویی', '⚗️'], ['فارماکوگنوزی', '🌿'], ['داروسازی بالینی', '🏥'], ['بیوتکنولوژی دارویی', '🧬']]) },
    ],
  },
  {
    id: 'other', label: 'مسیر دیگری دارم', emoji: '✨', hint: 'دانشگاه، زبان، مهارت یا هر هدف دیگر', stageQuestion: 'مسیرت',
    stages: [{ id: 'general', label: 'مطالعۀ شخصی', exam: null, tracks: [], subjects: seeds([['مطالعه', '📘'], ['تمرین', '✍️'], ['مرور', '🔁'], ['زبان', '🔤']]) }],
  },
]

export const studyGoals = [
  ['exam', 'آمادگی برای آزمون'],
  ['habit', 'عادت مطالعۀ منظم'],
  ['focus', 'تمرکز بیشتر'],
  ['grades', 'نمره‌های بهتر'],
  ['planning', 'برنامه‌ریزی روزانه'],
  ['friends', 'درس خواندن کنار دوستان'],
] as const
export type StudyGoal = (typeof studyGoals)[number][0]

export function findGroup(group: string | null | undefined) {
  return educationGroups.find((item) => item.id === group) ?? null
}

/** The stage the profile points at, or null when the profile is incomplete. */
export function findStage(group: string | null | undefined, stage: string | null | undefined) {
  const found = findGroup(group)
  return found?.stages.find((item) => item.id === stage) ?? (found?.stages.length === 1 ? found.stages[0] ?? null : null)
}

/** Learning tracks the profile can use; everyone may open every track when the profile is open-ended. */
export function tracksForProfile(group: string | null | undefined, stage: string | null | undefined): Track[] {
  const found = findStage(group, stage)
  return found && found.tracks.length > 0 ? found.tracks : ['konkur', 'konkur-math', 'konkur-humanities', 'medical-basics', 'preinternship', 'residency', 'dental-basics', 'bachelor-medicine', 'pharmacy']
}

/** Name of the exam the countdown points at, or null when the profile has none. */
export function examForProfile(group: string | null | undefined, stage: string | null | undefined) {
  return findStage(group, stage)?.exam ?? null
}

export function subjectsForProfile(group: string | null | undefined, stage: string | null | undefined) {
  return findStage(group, stage)?.subjects ?? educationGroups[0]!.stages[0]!.subjects
}

/** One-line summary, e.g. "دانشجوی پزشکی · استاجری". */
export function profileLabel(group: string | null | undefined, stage: string | null | undefined) {
  const found = findGroup(group)
  if (!found) return null
  const picked = findStage(group, stage)
  return picked && found.stages.length > 1 ? `${found.label} · ${picked.label}` : found.label
}
