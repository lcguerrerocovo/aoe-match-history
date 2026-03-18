/** A React fiber node — minimal interface for what we access */
export interface FiberLike {
  tag: number
  type: { displayName?: string; name?: string; __userModule?: boolean } | string | null
  stateNode: Element | null
  child: FiberLike | null
  sibling: FiberLike | null
  return: FiberLike | null
  _debugSource?: { fileName?: string } | null
}

/** A discovered component region with its bounding rect */
export interface ComponentRegion {
  /** Display name of the component */
  name: string
  /** Hierarchical path (e.g., "MatchList > MatchCard > TeamCard") */
  path: string
  /** Bounding rect in viewport coordinates */
  rect: DOMRect
  /** The fiber node for drilling down into children */
  fiber: FiberLike
}

/** A user annotation on a component region */
export interface Annotation {
  component: string
  path: string
  note: string
  timestamp: string
}
