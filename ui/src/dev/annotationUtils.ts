import type { Annotation } from './types'

/** Build an annotation payload */
export function buildAnnotationPayload(
  component: string,
  path: string,
  note: string,
): Annotation {
  return {
    component,
    path,
    note,
    timestamp: new Date().toISOString(),
  }
}
