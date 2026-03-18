import React, { useState, useEffect, useCallback, useRef } from 'react'
import { walkFiberTree } from './fiberWalker'
import { buildAnnotationPayload } from './annotationUtils'
import type { ComponentRegion, Annotation } from './types'

// --- Inline style constants ---
const OVERLAY_Z = 99999
const BOX_BORDER = '2px solid rgba(59, 130, 246, 0.6)'
const BOX_BG = 'rgba(59, 130, 246, 0.08)'
const LABEL_BG = 'rgba(30, 64, 175, 0.9)'
const LABEL_COLOR = '#fff'
const BADGE_BG = 'rgba(234, 88, 12, 0.9)'
const INPUT_BG = '#1e1e2e'
const INPUT_COLOR = '#e2e8f0'
const HELP_BG = 'rgba(0, 0, 0, 0.85)'
const ANNOTATED_BORDER = '2px solid rgba(234, 88, 12, 0.7)'
const ANNOTATED_BG = 'rgba(234, 88, 12, 0.08)'

/** Fetch existing annotations from the Vite dev server */
async function loadAnnotations(): Promise<Annotation[]> {
  try {
    const res = await fetch('/__ui-review/annotations')
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export function DevOverlay() {
  const [active, setActive] = useState(false)
  const [regions, setRegions] = useState<ComponentRegion[]>([])
  const [drillStack, setDrillStack] = useState<Array<{ fiber: ComponentRegion['fiber']; path: string }>>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [editingRegion, setEditingRegion] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [helpAutoShown, setHelpAutoShown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scan for regions whenever active state or drill level changes
  const scan = useCallback(() => {
    const root = document.getElementById('root')
    if (!root) return

    const top = drillStack[drillStack.length - 1]
    const found = walkFiberTree(root, top?.fiber ?? null, top?.path ?? '')
    setRegions(found)
  }, [drillStack])

  useEffect(() => {
    if (active) scan()
  }, [active, scan])

  // Load annotations from server when overlay activates
  useEffect(() => {
    if (active) {
      loadAnnotations().then(setAnnotations)
    }
  }, [active])

  // Re-scan on window resize/scroll to keep rects aligned
  useEffect(() => {
    if (!active) return
    const handler = () => scan()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [active, scan])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+D — toggle overlay
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setActive(prev => {
          const next = !prev
          if (next && !helpAutoShown) {
            setShowHelp(true)
            setHelpAutoShown(true)
            setTimeout(() => setShowHelp(false), 3000)
          }
          if (!next) {
            setDrillStack([])
            setEditingRegion(null)
          }
          return next
        })
        return
      }

      if (!active) return

      // Escape — go back one level or close
      if (e.key === 'Escape') {
        e.preventDefault()
        if (editingRegion) {
          setEditingRegion(null)
          setNoteText('')
        } else if (drillStack.length > 0) {
          setDrillStack(prev => prev.slice(0, -1))
        } else {
          setActive(false)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, drillStack, editingRegion, helpAutoShown])

  // Listen for HMR activation events from the Vite plugin
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on('ui-review:activate', () => {
        setActive(true)
        setDrillStack([])
        setEditingRegion(null)
        // Load fresh annotations (skill clears before activating)
        loadAnnotations().then(setAnnotations)
        if (!helpAutoShown) {
          setShowHelp(true)
          setHelpAutoShown(true)
          setTimeout(() => setShowHelp(false), 3000)
        }
      })
    }
  }, [helpAutoShown])

  // Focus input when editing
  useEffect(() => {
    if (editingRegion && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingRegion])

  const handleDrillDown = (region: ComponentRegion) => {
    if (editingRegion) return
    setDrillStack(prev => [...prev, { fiber: region.fiber, path: region.path }])
  }

  const handleLabelClick = (e: React.MouseEvent, region: ComponentRegion) => {
    e.stopPropagation()
    setEditingRegion(region.path)
    setNoteText('')
  }

  const handleSaveAnnotation = async (region: ComponentRegion) => {
    if (!noteText.trim()) {
      setEditingRegion(null)
      return
    }

    const annotation = buildAnnotationPayload(region.name, region.path, noteText.trim())
    const updated = [...annotations, annotation]
    setAnnotations(updated)
    setEditingRegion(null)
    setNoteText('')

    // POST full array to Vite dev server (replaces file contents)
    try {
      await fetch('/__ui-review/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      console.warn('[DevOverlay] Failed to save annotations to server')
    }
  }

  const annotationCount = (path: string) =>
    annotations.filter(a => a.path === path).length

  if (!active) return null

  return (
    <div
      data-testid="dev-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: OVERLAY_Z,
        pointerEvents: 'none',
      }}
    >
      {/* Region boxes */}
      {regions.map(region => {
        const count = annotationCount(region.path)
        const isAnnotated = count > 0
        const isEditing = editingRegion === region.path

        return (
          <div
            key={region.path}
            onClick={() => handleDrillDown(region)}
            style={{
              position: 'fixed',
              left: region.rect.x,
              top: region.rect.y,
              width: region.rect.width,
              height: region.rect.height,
              border: isAnnotated ? ANNOTATED_BORDER : BOX_BORDER,
              backgroundColor: isAnnotated ? ANNOTATED_BG : BOX_BG,
              pointerEvents: 'auto',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {/* Label tag */}
            <div
              onClick={e => handleLabelClick(e, region)}
              style={{
                position: 'absolute',
                top: -1,
                left: -1,
                backgroundColor: LABEL_BG,
                color: LABEL_COLOR,
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '0 0 4px 0',
                cursor: 'text',
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
              }}
            >
              {region.name}
              {isAnnotated && (
                <span
                  style={{
                    marginLeft: '4px',
                    backgroundColor: BADGE_BG,
                    borderRadius: '50%',
                    padding: '0 5px',
                    fontSize: '10px',
                  }}
                >
                  {count}
                </span>
              )}
            </div>

            {/* Annotation input */}
            {isEditing && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 0,
                  zIndex: OVERLAY_Z + 1,
                  pointerEvents: 'auto',
                }}
              >
                <input
                  ref={inputRef}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveAnnotation(region)
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setEditingRegion(null)
                      setNoteText('')
                    }
                  }}
                  placeholder="Type annotation, press Enter..."
                  style={{
                    backgroundColor: INPUT_BG,
                    color: INPUT_COLOR,
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    width: '280px',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Breadcrumb / depth indicator */}
      {drillStack.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: LABEL_BG,
            color: LABEL_COLOR,
            fontSize: '12px',
            fontFamily: 'monospace',
            padding: '4px 12px',
            borderRadius: '4px',
            pointerEvents: 'auto',
            zIndex: OVERLAY_Z + 2,
          }}
        >
          {drillStack.map(d => d.path.split(' > ').pop()).join(' > ')}
          <span style={{ marginLeft: '8px', opacity: 0.6 }}>ESC to go back</span>
        </div>
      )}

      {/* Help button */}
      <div
        onClick={() => setShowHelp(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: LABEL_BG,
          color: LABEL_COLOR,
          fontSize: '14px',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: OVERLAY_Z + 2,
        }}
      >
        ?
      </div>

      {/* Help panel */}
      {showHelp && (
        <div
          style={{
            position: 'fixed',
            bottom: 52,
            right: 16,
            backgroundColor: HELP_BG,
            color: '#e2e8f0',
            fontSize: '12px',
            fontFamily: 'monospace',
            padding: '12px 16px',
            borderRadius: '8px',
            lineHeight: 1.8,
            pointerEvents: 'auto',
            zIndex: OVERLAY_Z + 2,
          }}
        >
          <div><kbd>Ctrl+Shift+D</kbd> Toggle overlay</div>
          <div><kbd>Click region</kbd> Drill into children</div>
          <div><kbd>Click label</kbd> Annotate</div>
          <div><kbd>Enter</kbd> Save note</div>
          <div><kbd>Escape</kbd> Go back / close</div>
        </div>
      )}
    </div>
  )
}
