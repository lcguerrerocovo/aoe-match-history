import type { FiberLike, ComponentRegion } from './types'

/**
 * Find the React fiber instance attached to a DOM element.
 * React attaches fibers with keys like `__reactFiber$xxxx` where the suffix
 * changes per React build. For root containers (e.g., document.getElementById('root')),
 * React 18's createRoot uses `__reactContainer$xxxx` instead.
 */
export function getFiberFromElement(el: Element): FiberLike | null {
  const elRecord = el as unknown as Record<string, unknown>
  // Try __reactFiber$ first (rendered elements), then __reactContainer$ (root containers)
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')
  )
  if (!key) return null
  return elRecord[key] as FiberLike
}

/**
 * Get the display name for a fiber, or null if it's a host element / unnamed.
 */
export function getComponentName(fiber: FiberLike): string | null {
  if (!fiber.type || typeof fiber.type === 'string') return null
  return fiber.type.displayName || fiber.type.name || null
}

// User-defined infrastructure components to exclude from the overlay
const INFRA_COMPONENTS = new Set(['CustomThemeProvider', 'ThemeBridge'])

/**
 * Check if a fiber represents a user-authored component.
 *
 * Uses the __userModule marker injected by vite-plugin-ui-review's transform
 * hook at build time. Only components exported from files under ui/src/
 * (excluding ui/src/dev/) get tagged, so library/infrastructure components
 * are excluded without any name-based blocklist. A small set of user-defined
 * infrastructure components (providers, bridges) is also excluded.
 */
export function isUserComponent(fiber: FiberLike): boolean {
  if (!fiber.type || typeof fiber.type === 'string') return false
  if (!fiber.type.__userModule) return false
  const name = fiber.type.displayName || fiber.type.name || ''
  return !INFRA_COMPONENTS.has(name)
}

/**
 * Walk down from a fiber to find the bounding rect of its host DOM elements.
 * For function components, stateNode is null — we walk to host children.
 * For fragments/multiple children, we union the rects.
 */
export function getHostRect(fiber: FiberLike): DOMRect | null {
  // Host component — has a direct DOM node
  if (fiber.stateNode instanceof Element) {
    return fiber.stateNode.getBoundingClientRect()
  }

  // Walk children to collect all host rects (handles fragments)
  const rects = collectHostRects(fiber)
  if (rects.length === 0) return null
  return unionRects(rects)
}

/**
 * Recursively collect bounding rects from all host descendants of a fiber.
 */
function collectHostRects(fiber: FiberLike): DOMRect[] {
  const rects: DOMRect[] = []
  let child = fiber.child
  while (child) {
    if (child.stateNode instanceof Element) {
      rects.push(child.stateNode.getBoundingClientRect())
    } else {
      rects.push(...collectHostRects(child))
    }
    child = child.sibling
  }
  return rects
}

/**
 * Compute the union bounding rect of multiple DOMRects.
 */
export function unionRects(rects: DOMRect[]): DOMRect {
  if (rects.length === 0) return new DOMRect(0, 0, 0, 0)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
}

/**
 * Walk the fiber tree from a root element, collecting all user-authored
 * component regions at the current depth.
 *
 * @param rootEl - The DOM root element (e.g., document.getElementById('root'))
 * @param parentFiber - If provided, only walk children of this fiber (for drill-down)
 * @param parentPath - Path prefix for hierarchical naming
 * @returns Array of discovered component regions
 */
export function walkFiberTree(
  rootEl: Element,
  parentFiber?: FiberLike | null,
  parentPath?: string,
): ComponentRegion[] {
  const regions: ComponentRegion[] = []

  const startFiber = parentFiber?.child ?? getFiberFromElement(rootEl)
  if (!startFiber) return regions

  const queue: Array<{ fiber: FiberLike }> = []
  let current: FiberLike | null = startFiber

  // Enqueue all siblings at the start level
  while (current) {
    queue.push({ fiber: current })
    current = current.sibling
  }

  // BFS — when we find a user component, add it and don't recurse into it
  // (its children are revealed on drill-down)
  while (queue.length > 0) {
    const { fiber } = queue.shift()!

    if (isUserComponent(fiber)) {
      const name = getComponentName(fiber)!
      const path = parentPath ? `${parentPath} > ${name}` : name
      const rect = getHostRect(fiber)
      if (rect && rect.width > 0 && rect.height > 0) {
        regions.push({ name, path, rect, fiber })
      }
      // Don't recurse — children are revealed on drill-down
      continue
    }

    // Not a user component — keep searching its children
    let child = fiber.child
    while (child) {
      queue.push({ fiber: child })
      child = child.sibling
    }
  }

  return regions
}
