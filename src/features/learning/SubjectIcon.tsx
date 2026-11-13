import { Activity, Atom, Baby, Bone, BookOpen, Brain, Bug, Dna, Eye, FlaskConical, HeartPulse, Leaf, Microscope, Pill, Scale, ShieldCheck, Stethoscope, TestTubeDiagonal } from 'lucide-react'

const subjectIcons: Record<string, typeof BookOpen> = {
  biology: Leaf, chemistry: FlaskConical, physics: Atom, math: Scale, geology: Leaf,
  anatomy: Bone, physiology: Activity, biochemistry: TestTubeDiagonal, bacteriology: Bug,
  parasitology: Bug, mycology: Leaf, virology: Bug, immunology: ShieldCheck, genetics: Dna,
  pathology: Microscope, histology: Microscope, embryology: Baby, nutrition: Leaf,
  cardiology: HeartPulse, pulmonology: Activity, nephrology: Activity, endocrinology: Activity,
  neurology: Brain, psychiatry: Brain, 'clinical-psychology': Brain, ophthalmology: Eye,
  pharmacology: Pill, surgery: Stethoscope, pediatrics: Baby, gynecology: Baby, infectious: Bug,
  'medical-physics': Atom, reasoning: Brain, 'clinical-comprehensive': Stethoscope,
}
const tones = ['bg-primary/10 text-primary', 'bg-chart-2/10 text-chart-2', 'bg-chart-4/10 text-chart-4', 'bg-chart-3/10 text-chart-3']
export default function SubjectIcon({ id, index = 0 }: { id: string; index?: number }) {
  const Icon = subjectIcons[id] ?? BookOpen
  return <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[index % tones.length]}`}><Icon size={20} strokeWidth={1.7} /></span>
}
