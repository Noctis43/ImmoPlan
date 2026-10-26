import { useEffect, useRef, useCallback } from 'react';

export function useCursor(enabled = true) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const moveCursor = useCallback((x: number, y: number) => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${x}px`;
      cursorRef.current.style.top = `${y}px`;
    }
    if (ringRef.current) {
      requestAnimationFrame(() => {
        if (ringRef.current) {
          ringRef.current.style.left = `${x}px`;
          ringRef.current.style.top = `${y}px`;
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      moveCursor(e.clientX, e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.classList.contains('interactive') ||
        target.closest('a') !== null ||
        target.closest('button') !== null;

      if (cursorRef.current) {
        cursorRef.current.classList.toggle('hovered', isInteractive);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [enabled, moveCursor]);

  return { cursorRef, ringRef };
}
