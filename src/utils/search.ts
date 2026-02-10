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

export const tokenizeQuery = (rawInput: string): string[] => {
  const raw = rawInput.trim().toLowerCase()
  if (!raw) return []
  // Split into "words" that are likely to match name/operator/constellation/IDs.
  return raw.match(/[a-z0-9]+/g) ?? []
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

export type SearchMatchField = 'norad' | 'name' | 'constellation' | 'operator'
export type SearchMatchStrength = 'exact' | 'prefix' | 'contains' | 'tokens' | 'none'

export type SearchCandidate = {
  name: string
  noradId: number
  constellation?: string
  operator?: string
}

export type SearchMatchInfo = {
  field: SearchMatchField
  strength: SearchMatchStrength
  score: number
}

const scoreStringField = (value: string | undefined, rawLower: string, tokens: string[]) => {
  if (!value) return { strength: 'none' as const, score: 0 }
  const lower = value.toLowerCase()
  if (lower === rawLower) return { strength: 'exact' as const, score: 100 }
  if (rawLower && lower.startsWith(rawLower)) return { strength: 'prefix' as const, score: 80 }
  const matched = tokens.filter((token) => lower.includes(token))
  if (matched.length === 0) return { strength: 'none' as const, score: 0 }
  if (matched.length === tokens.length) return { strength: 'tokens' as const, score: 65 + matched.length }
  return { strength: 'contains' as const, score: 50 + matched.length }
}

export const getSearchMatchInfo = (candidate: SearchCandidate, rawQuery: string): SearchMatchInfo => {
  const rawLower = rawQuery.trim().toLowerCase()
  const tokens = tokenizeQuery(rawLower)

  const norad = candidate.noradId.toString()
  if (norad === rawLower) {
    return { field: 'norad', strength: 'exact', score: 1000 }
  }
  if (tokens.includes(norad)) {
    return { field: 'norad', strength: 'tokens', score: 950 }
  }
  const noradPrefix = tokens.find((token) => /^[0-9]+$/.test(token) && norad.startsWith(token))
  if (noradPrefix) {
    return { field: 'norad', strength: 'prefix', score: 900 }
  }

  const nameScore = scoreStringField(candidate.name, rawLower, tokens)
  const constellationScore = scoreStringField(candidate.constellation, rawLower, tokens)
  const operatorScore = scoreStringField(candidate.operator, rawLower, tokens)

  // Weight name matches above constellation/operator matches for more intuitive ordering.
  const weighted = [
    { field: 'name' as const, strength: nameScore.strength, score: nameScore.score + 500 },
    { field: 'constellation' as const, strength: constellationScore.strength, score: constellationScore.score + 350 },
    { field: 'operator' as const, strength: operatorScore.strength, score: operatorScore.score + 300 },
  ]

  const best = weighted.reduce((acc, curr) => (curr.score > acc.score ? curr : acc), {
    field: 'name' as const,
    strength: 'none' as const,
    score: 0,
  })
  return best
}
