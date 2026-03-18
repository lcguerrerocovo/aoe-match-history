import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { handleAnnotationsPost, handleAnnotationsGet, handleClear, resolveAnnotationsPath, uiReviewPlugin } from './vite-plugin-ui-review'

vi.mock('fs')

describe('resolveAnnotationsPath', () => {
  it('resolves to .ui-review/annotations.json relative to project root', () => {
    const result = resolveAnnotationsPath('/projects/aoe-match-history/ui')
    expect(result).toBe(path.resolve('/projects/aoe-match-history', '.ui-review', 'annotations.json'))
  })
})

describe('handleAnnotationsPost', () => {
  afterEach(() => vi.restoreAllMocks())

  it('writes annotations array to disk', () => {
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

    const annotations = [{ component: 'TeamCard', path: 'TeamCard', note: 'too bold', timestamp: '2026-03-18T00:00:00Z' }]
    handleAnnotationsPost(annotations, '/tmp/test/.ui-review/annotations.json')

    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname('/tmp/test/.ui-review/annotations.json'), { recursive: true })
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/test/.ui-review/annotations.json',
      JSON.stringify(annotations, null, 2),
    )
  })
})

describe('handleAnnotationsGet', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns empty array when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    expect(handleAnnotationsGet('/tmp/test/.ui-review/annotations.json')).toEqual([])
  })

  it('returns parsed annotations when file exists', () => {
    const data = [{ component: 'TeamCard', path: 'TeamCard', note: 'test', timestamp: '2026-03-18T00:00:00Z' }]
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(data))
    expect(handleAnnotationsGet('/tmp/test/.ui-review/annotations.json')).toEqual(data)
  })
})

describe('handleClear', () => {
  afterEach(() => vi.restoreAllMocks())

  it('deletes annotation file if it exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.unlinkSync).mockReturnValue(undefined)
    handleClear('/tmp/test/.ui-review/annotations.json')
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test/.ui-review/annotations.json')
  })

  it('does nothing if file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    handleClear('/tmp/test/.ui-review/annotations.json')
    expect(fs.unlinkSync).not.toHaveBeenCalled()
  })
})

describe('transform hook', () => {
  const plugin = uiReviewPlugin()
  const transform = (plugin as any).transform.bind(plugin)

  it('tags exported function components', () => {
    const code = 'export function MatchCard() { return null }'
    const result = transform(code, '/project/ui/src/components/MatchCard.tsx')
    expect(result.code).toContain('MatchCard.__userModule=true')
  })

  it('tags exported const components', () => {
    const code = 'export const ProfileHeader = () => null'
    const result = transform(code, '/project/ui/src/components/ProfileHeader.tsx')
    expect(result.code).toContain('ProfileHeader.__userModule=true')
  })

  it('tags multiple exports', () => {
    const code = 'export function Foo() {}\nexport const Bar = () => null'
    const result = transform(code, '/project/ui/src/utils.tsx')
    expect(result.code).toContain('Foo.__userModule=true')
    expect(result.code).toContain('Bar.__userModule=true')
  })

  it('skips node_modules files', () => {
    const code = 'export function Box() {}'
    const result = transform(code, '/project/node_modules/@chakra-ui/react/box.js')
    expect(result).toBeNull()
  })

  it('skips dev overlay files', () => {
    const code = 'export function DevOverlay() {}'
    const result = transform(code, '/project/ui/src/dev/DevOverlay.tsx')
    expect(result).toBeNull()
  })

  it('skips files with no PascalCase exports', () => {
    const code = 'export const apiUrl = "/api"'
    const result = transform(code, '/project/ui/src/config.ts')
    expect(result).toBeNull()
  })

  it('tags export default function', () => {
    const code = 'export default function App() { return null }'
    const result = transform(code, '/project/ui/src/App.tsx')
    expect(result.code).toContain('App.__userModule=true')
  })
})
