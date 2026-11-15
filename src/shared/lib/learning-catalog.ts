import type { Provider, Track } from '../api/learning'

const clinical = [
  ['clinical-comprehensive', 'جامع بالینی', '🩺'],
  ['pulmonology', 'ریه', '🫁'], ['nephrology', 'نفرولوژی', '💧'], ['endocrinology', 'غدد', '⚖️'],
  ['rheumatology', 'روماتولوژی', '🦴'], ['hematology', 'خون', '🩸'], ['gastroenterology', 'گوارش', '🍽️'],
  ['cardiology', 'قلب', '🫀'], ['surgery', 'جراحی', '🩺'], ['pediatrics', 'اطفال', '🧸'], ['gynecology', 'زنان', '🌷'],
  ['neurology', 'نورولوژی', '🧠'], ['infectious', 'عفونی', '🦠'], ['radiology', 'رادیولوژی', '🩻'],
  ['psychiatry', 'روان‌پزشکی', '💬'], ['dermatology', 'پوست', '🧴'], ['orthopedics', 'ارتوپدی', '🦿'],
  ['urology', 'اورولوژی', '💧'], ['ophthalmology', 'چشم‌پزشکی', '👁️'], ['ent', 'گوش، حلق و بینی', '👂'],
  ['epidemiology', 'آمار و اپیدمیولوژی', '📊'], ['pharmacology', 'فارماکولوژی', '💊'], ['ethics', 'اخلاق پزشکی', '🤝'],
  ['pathology', 'پاتولوژی', '🔬'], ['genetics', 'ژنتیک', '🧬'], ['medical-physics', 'فیزیک پزشکی', '⚛️'],
  ['immunology', 'ایمونولوژی', '🛡️'], ['nutrition', 'تغذیه', '🥗'], ['internal', 'جنرال داخلی', '🩺'],
] as const
const basics = [
  ['physiology', 'فیزیولوژی', '🫀'], ['biochemistry', 'بیوشیمی', '🧪'], ['bacteriology', 'باکتری', '🦠'],
  ['parasitology', 'انگل', '🪱'], ['entomology', 'حشره‌شناسی', '🦋'], ['mycology', 'قارچ', '🍄'], ['virology', 'ویروس', '🦠'],
  ['anatomy', 'آناتومی', '🦴'], ['histology', 'بافت‌شناسی', '🔬'], ['embryology', 'جنین‌شناسی', '🌱'],
  ['health', 'اصول خدمات سلامت', '🏥'], ['epidemiology', 'اپیدمیولوژی', '📊'], ['immunology', 'ایمونولوژی', '🛡️'],
  ['english', 'زبان انگلیسی', '🔤'], ['islamic', 'اندیشه و انقلاب اسلامی', '📖'], ['nutrition', 'تغذیه', '🥗'],
  ['genetics', 'ژنتیک', '🧬'], ['pathology', 'پاتولوژی', '🔬'], ['medical-physics', 'فیزیک پزشکی', '⚛️'],
] as const
const dentalIds: string[] = ['anatomy', 'embryology', 'histology', 'biochemistry', 'medical-physics', 'parasitology', 'mycology', 'bacteriology', 'virology', 'pathology', 'immunology', 'islamic']
const dental = [...basics.filter(([id]) => dentalIds.includes(id)), ['clinical-psychology', 'روان‌شناسی بالینی', '💬'], ['oral-health', 'سلامت دهان و دندان', '🦷']] as const
const konkur = [['biology', 'زیست‌شناسی', '🌿'], ['chemistry', 'شیمی', '🧪'], ['physics', 'فیزیک', '⚛️'], ['math', 'ریاضی', '📐'], ['geology', 'زمین‌شناسی', '🌍'], ['literature', 'ادبیات فارسی', '📚'], ['arabic', 'عربی', '📖'], ['religion', 'دین و زندگی', '🌱'], ['english', 'زبان انگلیسی', '🔤']] as const
const konkurMath = [['math', 'ریاضی', '📐'], ['geometry', 'هندسه', '📏'], ['discrete', 'گسسته', '🔢'], ['physics', 'فیزیک', '⚛️'], ['chemistry', 'شیمی', '🧪'], ['literature', 'ادبیات فارسی', '📚'], ['arabic', 'عربی', '📖'], ['religion', 'دین و زندگی', '🌱'], ['english', 'زبان انگلیسی', '🔤']] as const
const konkurHumanities = [['literature-special', 'ادبیات اختصاصی', '✒️'], ['arabic-special', 'عربی اختصاصی', '📖'], ['math-stats', 'ریاضی و آمار', '📊'], ['economics', 'اقتصاد', '💹'], ['history-geography', 'تاریخ و جغرافیا', '🗺️'], ['sociology', 'جامعه‌شناسی', '👥'], ['philosophy-logic', 'فلسفه و منطق', '💭'], ['psychology', 'روان‌شناسی', '🧠'], ['religion', 'دین و زندگی', '🌱'], ['english', 'زبان انگلیسی', '🔤']] as const
const pharmacy = [['medicinal-chemistry', 'شیمی دارویی', '⚗️'], ['pharmaceutics', 'فارماسیوتیکس', '🧴'], ['pharmacognosy', 'فارماکوگنوزی', '🌿'], ['pharmacology', 'فارماکولوژی', '💊'], ['pharmacotherapy', 'فارماکوتراپی', '🩺'], ['toxicology', 'سم‌شناسی', '☠️'], ['biochemistry', 'بیوشیمی', '🧪'], ['microbiology', 'میکروب‌شناسی', '🦠'], ['clinical-pharmacy', 'داروسازی بالینی', '🏥']] as const
type Subject = { id: string; name: string; emoji: string }
const subjects = (items: readonly (readonly string[])[]): Subject[] => items.map(([id, name, emoji]) => ({ id: id!, name: name!, emoji: emoji! }))
export const learningTracks: { id: Track; name: string; emoji: string; subjects: Subject[] }[] = [
  { id: 'preinternship', name: 'پره‌انترنی', emoji: '🩺', subjects: subjects(clinical) },
  { id: 'residency', name: 'دستیاری پزشکی', emoji: '🏥', subjects: subjects(clinical) },
  { id: 'medical-basics', name: 'علوم پایه پزشکی', emoji: '🔬', subjects: subjects(basics) },
  { id: 'dental-basics', name: 'علوم پایه دندان‌پزشکی', emoji: '🦷', subjects: subjects(dental) },
  { id: 'bachelor-medicine', name: 'لیسانس به پزشکی', emoji: '🎓', subjects: subjects([...basics, ['reasoning', 'مهارت‌های استدلال و تفکر نقاد', '💡']]) },
  { id: 'konkur', name: 'کنکور تجربی', emoji: '🎯', subjects: subjects(konkur) },
  { id: 'konkur-math', name: 'کنکور ریاضی', emoji: '📐', subjects: subjects(konkurMath) },
  { id: 'konkur-humanities', name: 'کنکور انسانی', emoji: '📜', subjects: subjects(konkurHumanities) },
  { id: 'pharmacy', name: 'داروسازی (۱۸۰ و پایان دوره)', emoji: '💊', subjects: subjects(pharmacy) },
]
export const providerNames: Record<Provider, string> = { national: 'آزمون کشوری', authored: 'تألیفی', konkur: 'کنکور سراسری', maz: 'ماز', ghalamchi: 'قلم‌چی', gaj: 'گاج', 'konkuri-nerd': 'کنکوری نرد', medmcqa: 'MedMCQA', openstax: 'OpenStax', other: 'سایر' }
export const difficultyNames = { easy: 'آسان', medium: 'متوسط', hard: 'سخت' }
export const bankNames = { national: 'کشوری', authored: 'تألیفی', weekly: 'آزمون‌های هفتگی', reference: 'منابع باز' }
export const subjectName = (id: string) => learningTracks.flatMap((t) => t.subjects).find((s) => s.id === id)?.name ?? id
export const validSubjects = (track: Track, ids: string[]) => ids.every((id) => learningTracks.find((t) => t.id === track)?.subjects.some((s) => s.id === id))

/** Negative marking: three wrong answers cancel one correct answer. */
export function examResult(answers: { selectedIndex: number | null; correctIndex: number }[]) {
  const correct = answers.filter((a) => a.selectedIndex === a.correctIndex).length
  const skipped = answers.filter((a) => a.selectedIndex === null).length
  const wrong = answers.length - correct - skipped
  return { correct, wrong, skipped, percent: answers.length ? Math.round(((correct * 3 - wrong) / (answers.length * 3)) * 10000) / 100 : 0 }
}

export function reviewInterval(previousDays: number, correct: boolean) {
  return correct ? Math.min(60, Math.max(1, previousDays * 2)) : 1
}
