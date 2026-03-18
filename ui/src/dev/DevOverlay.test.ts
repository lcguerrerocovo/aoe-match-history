import { describe, it, expect } from 'vitest'
import { buildAnnotationPayload } from './annotationUtils'

describe('buildAnnotationPayload', () => {
  it('creates annotation with ISO timestamp', () => {
    const result = buildAnnotationPayload('TeamCard', 'MatchList > MatchCard > TeamCard', 'too bold')
    expect(result.component).toBe('TeamCard')
    expect(result.path).toBe('MatchList > MatchCard > TeamCard')
    expect(result.note).toBe('too bold')
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
