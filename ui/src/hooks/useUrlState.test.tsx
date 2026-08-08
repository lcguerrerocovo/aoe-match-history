import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter, useSearchParams, Routes, Route } from 'react-router-dom';
import { useUrlState } from './useUrlState';

// Wrap useUrlState in a router so useSearchParams works.
function wrapper({ initialPath }: { initialPath: string }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="*" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('useUrlState', () => {
  it('derives the value from the URL and defaults when absent', () => {
    const { result } = renderHook(() => useUrlState<string>({ key: 'map', defaultValue: 'all' }), {
      wrapper: wrapper({ initialPath: '/x?map=Arabia' }),
    });
    expect(result.current[0]).toBe('Arabia');

    const { result: def } = renderHook(() => useUrlState<string>({ key: 'map', defaultValue: 'all' }), {
      wrapper: wrapper({ initialPath: '/x' }),
    });
    expect(def.current[0]).toBe('all');
  });

  it('writes the value to the URL (replace) and reflects it on re-render', () => {
    const { result } = renderHook(() => useUrlState<string>({ key: 'type', defaultValue: 'RM 1v1' }), {
      wrapper: wrapper({ initialPath: '/x' }),
    });
    act(() => result.current[1]('RM Team'));
    expect(result.current[0]).toBe('RM Team');
  });

  it('deletes the param when set to the default (keeps URLs clean)', () => {
    const { result } = renderHook(
      () => {
        const v = useUrlState<string>({ key: 'type', defaultValue: 'RM 1v1' });
        const sp = useSearchParams()[0];
        return { v, sp };
      },
      { wrapper: wrapper({ initialPath: '/x?type=RM%20Team' }) },
    );
    act(() => result.current.v[1]('RM 1v1'));
    expect(result.current.sp.get('type')).toBeNull(); // default -> removed from URL
  });

  // REGRESSION GUARD for the #38 "clicking a tab doesn't switch" bug:
  // calling multiple useUrlState setters sequentially each issues a separate
  // navigation, so only the last write survived (the category was lost).
  // The fix is to batch multiple param changes into a SINGLE setSearchParams
  // updater. This test proves a single updater that sets one param and deletes
  // others applies ALL changes atomically (one navigation).
  it('a single setSearchParams updater applies multiple param changes atomically', () => {
    const { result } = renderHook(
      () => {
        const [, setSearchParams] = useSearchParams();
        const [type] = useUrlState<string>({ key: 'type', defaultValue: 'RM 1v1' });
        const [map] = useUrlState<string>({ key: 'map', defaultValue: '' });
        const [elo] = useUrlState<string>({ key: 'elo', defaultValue: '' });
        const [civ] = useUrlState<string>({ key: 'civ', defaultValue: '' });
        return { setSearchParams, type, map, elo, civ };
      },
      { wrapper: wrapper({ initialPath: '/x?type=RM%201v1&map=Arabia&elo=Gold&civ=Franks' }) },
    );

    // Simulate handleCategorySelect: ONE setSearchParams that sets type and
    // clears map/elo/civ together.
    act(() => {
      result.current.setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('type', 'RM Team');
        p.delete('map');
        p.delete('elo');
        p.delete('civ');
        return p;
      }, { replace: true });
    });

    expect(result.current.type).toBe('RM Team'); // category switched
    expect(result.current.map).toBe('');          // map cleared
    expect(result.current.elo).toBe('');          // elo cleared
    expect(result.current.civ).toBe('');          // civ cleared
  });
});
