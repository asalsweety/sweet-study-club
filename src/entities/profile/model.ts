export type Profile = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: 'member' | 'admin'
  theme: 'light' | 'dark' | 'system'
}
