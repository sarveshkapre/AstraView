export const parseMultiNoradIds = (rawInput: string): string[] | null => {
  const raw = rawInput.trim()
  if (!raw) return null

  // Keep this intentionally narrow: explicit delimiters signal "paste a list of IDs".
  if (!/[,\n;]/.test(raw)) return null

  const matches = raw.match(/\d{1,6}/g) ?? []
  const seen = new Set<string>()
  const ids: string[] = []
  for (const match of matches) {
    const normalized = match.replace(/^0+/, '') || '0'
    if (seen.has(normalized)) continue
    seen.add(normalized)
    ids.push(normalized)
  }
  return ids.length >= 2 ? ids : null
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type HighlightToken = { text: string; match: boolean }

export const tokenizeHighlight = (text: string, query: string): HighlightToken[] => {
  const rawQuery = query.trim()
  if (!rawQuery) return [{ text, match: false }]

  const escaped = escapeRegExp(rawQuery)
  const regex = new RegExp(`(${escaped})`, 'ig')
  const parts = text.split(regex)
  if (parts.length === 1) return [{ text, match: false }]

  const lowered = rawQuery.toLowerCase()
  return parts.filter(Boolean).map((part) => ({
    text: part,
    match: part.toLowerCase() === lowered,
  }))
}

