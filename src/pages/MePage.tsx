import type { UserProfile } from '../shared/api/profile'

export default function MePage({ profile }: { profile: UserProfile }) {
  return <section className="glass rounded-[2rem] p-6">MePage · {profile.displayName}</section>
}
