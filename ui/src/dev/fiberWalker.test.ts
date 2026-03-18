import { describe, it, expect } from 'vitest'
import { getFiberFromElement, getComponentName, isUserComponent, unionRects, walkFiberTree } from './fiberWalker'
import type { FiberLike } from './types'

describe('getFiberFromElement', () => {
  it('returns null for element with no fiber key', () => {
    const el = document.createElement('div')
    expect(getFiberFromElement(el)).toBeNull()
  })

  it('finds fiber via __reactFiber$ prefixed key', () => {
    const el = document.createElement('div') as any
    const fakeFiber = { tag: 0 }
    el['__reactFiber$abc123'] = fakeFiber
    expect(getFiberFromElement(el)).toBe(fakeFiber)
  })

  it('finds fiber via __reactContainer$ prefixed key (React 18 root)', () => {
    const el = document.createElement('div') as any
    const fakeFiber = { tag: 3 }
    el['__reactContainer$abc123'] = fakeFiber
    expect(getFiberFromElement(el)).toBe(fakeFiber)
  })
})

describe('getComponentName', () => {
  it('prefers displayName', () => {
    const fiber = { type: { displayName: 'MyComponent', name: 'Func' } } as FiberLike
    expect(getComponentName(fiber)).toBe('MyComponent')
  })

  it('falls back to name', () => {
    const fiber = { type: { name: 'MyComponent' } } as FiberLike
    expect(getComponentName(fiber)).toBe('MyComponent')
  })

  it('returns null for string type (host element)', () => {
    const fiber = { type: 'div' } as FiberLike
    expect(getComponentName(fiber)).toBeNull()
  })

  it('returns null for null type', () => {
    const fiber = { type: null } as FiberLike
    expect(getComponentName(fiber)).toBeNull()
  })
})

describe('isUserComponent', () => {
  it('returns true for component with __userModule tag', () => {
    const fiber = {
      type: { name: 'MatchCard', __userModule: true },
    } as FiberLike
    expect(isUserComponent(fiber)).toBe(true)
  })

  it('returns false for component without __userModule tag', () => {
    const fiber = {
      type: { name: 'Box' },
    } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })

  it('returns false for host element (string type)', () => {
    const fiber = { type: 'div' } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })

  it('returns false for null type', () => {
    const fiber = { type: null } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })

  it('returns false when __userModule is falsy', () => {
    const fiber = {
      type: { name: 'Something', __userModule: false as any },
    } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })

  it('excludes CustomThemeProvider even with __userModule tag', () => {
    const fiber = {
      type: { name: 'CustomThemeProvider', __userModule: true },
    } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })

  it('excludes ThemeBridge even with __userModule tag', () => {
    const fiber = {
      type: { name: 'ThemeBridge', __userModule: true },
    } as FiberLike
    expect(isUserComponent(fiber)).toBe(false)
  })
})

describe('unionRects', () => {
  it('returns union of multiple rects', () => {
    const rects = [
      new DOMRect(10, 20, 100, 50),
      new DOMRect(50, 10, 80, 100),
    ]
    const union = unionRects(rects)
    expect(union.x).toBe(10)
    expect(union.y).toBe(10)
    expect(union.width).toBe(120) // right edge: max(110, 130) - 10
    expect(union.height).toBe(100) // bottom edge: max(70, 110) - 10
  })

  it('returns zero rect for empty array', () => {
    const union = unionRects([])
    expect(union.width).toBe(0)
    expect(union.height).toBe(0)
  })
})

describe('walkFiberTree', () => {
  it('returns empty array when no fiber found on element', () => {
    const el = document.createElement('div')
    expect(walkFiberTree(el)).toEqual([])
  })
})
