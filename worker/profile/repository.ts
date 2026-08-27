import {
  profileSchema,
  type UpdateProfileInput,
  type UserProfile,
} from '../../src/shared/api/profile'

type ProfileRow = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: string
  theme: string
}

const selectProfileSql = `
  SELECT
    id,
    email,
    name AS displayName,
    image AS avatarUrl,
    role,
    theme
  FROM user
  WHERE id = ?
`

export async function findProfileByUserId(
  database: D1Database,
  userId: string,
): Promise<UserProfile | null> {
  const row = await database
    .prepare(selectProfileSql)
    .bind(userId)
    .first<ProfileRow>()

  return row === null ? null : profileSchema.parse(row)
}

export async function updateProfileByUserId(
  database: D1Database,
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile | null> {
  const assignments: string[] = []
  const values: unknown[] = []

  if (input.displayName !== undefined) {
    assignments.push('name = ?')
    values.push(input.displayName)
  }

  if (input.theme !== undefined) {
    assignments.push('theme = ?')
    values.push(input.theme)
  }

  assignments.push('updatedAt = ?')
  values.push(Date.now())

  await database
    .prepare(
      `UPDATE user SET ${assignments.join(', ')} WHERE id = ?`,
    )
    .bind(...values, userId)
    .run()

  return findProfileByUserId(database, userId)
}
