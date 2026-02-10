import { describe, expect, it } from 'vitest'
import { getSearchMatchInfo, parseMultiNoradIds, tokenizeHighlight, tokenizeQuery } from './search'

describe('parseMultiNoradIds', () => {
  it('returns null when no explicit list delimiter is present', () => {
    expect(parseMultiNoradIds('25544')).toBeNull()
    expect(parseMultiNoradIds('iss 25544')).toBeNull()
    expect(parseMultiNoradIds('gps 12345 67890')).toBeNull()
  })

  it('parses comma/newline-separated NORAD ID lists and preserves order', () => {
    expect(parseMultiNoradIds('25544, 20580')).toEqual(['25544', '20580'])
    expect(parseMultiNoradIds('  25544\n20580\n25544  ')).toEqual(['25544', '20580'])
    expect(parseMultiNoradIds('NORAD 025544, 020580')).toEqual(['25544', '20580'])
  })
})

describe('tokenizeHighlight', () => {
  it('splits and marks matched substrings (case-insensitive)', () => {
    expect(tokenizeHighlight('STARLINK-1234', 'link')).toEqual([
      { text: 'STAR', match: false },
      { text: 'LINK', match: true },
      { text: '-1234', match: false },
    ])
  })

  it('returns a single non-matched token when query is empty', () => {
    expect(tokenizeHighlight('ISS', '')).toEqual([{ text: 'ISS', match: false }])
  })
})

describe('tokenizeQuery', () => {
  it('extracts alphanumeric tokens and strips punctuation', () => {
    expect(tokenizeQuery('  ISS, 25544;  oneweb-0123 ')).toEqual(['iss', '25544', 'oneweb', '0123'])
  })
})

describe('getSearchMatchInfo', () => {
  const candidate = { name: 'ISS (ZARYA)', noradId: 25544, constellation: undefined, operator: 'NASA' }

  it('prefers exact NORAD matches', () => {
    expect(getSearchMatchInfo(candidate, '25544')).toMatchObject({ field: 'norad', strength: 'exact' })
  })

  it('scores name token matches above operator token matches', () => {
    const byName = getSearchMatchInfo(candidate, 'iss')
    const byOperator = getSearchMatchInfo(candidate, 'nasa')
    expect(byName.field).toBe('name')
    expect(byName.score).toBeGreaterThan(byOperator.score)
  })
})
