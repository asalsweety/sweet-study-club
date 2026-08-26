import { z } from 'zod'
import type { Profile } from '../../../entities/profile/model'
import { supabase } from '../../../lib/supabase'

const legacyProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  display_name: z.string().min(1),
  avatar_url: z.string().nullable(),
  role: z.enum(['member', 'admin']),
  theme: z.enum(['light', 'dark', 'system']),
})

function toProfile(value: unknown): Profile {
  const profile = legacyProfileSchema.parse(value)

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    theme: profile.theme,
  }
}

export const legacySupabaseProfileApi = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, theme')
      .eq('id', userId)
      .single()

    if (error) throw error
    return toProfile(data)
  },

  async updateTheme(userId: string, theme: Profile['theme']) {
    const { error } = await supabase
      .from('profiles')
      .update({ theme })
      .eq('id', userId)

    if (error) throw error
  },
}
