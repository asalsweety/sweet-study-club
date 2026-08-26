export async function collectPages<T>(
  loadPage: (from: number, to: number) => Promise<readonly T[]>,
  pageSize = 1000,
) {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error('Page size must be a positive integer.')
  }

  const results: T[] = []
  let from = 0

  while (true) {
    const page = await loadPage(from, from + pageSize - 1)
    results.push(...page)

    if (page.length < pageSize) {
      return results
    }

    from += pageSize
  }
}
