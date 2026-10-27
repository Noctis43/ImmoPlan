import { useCursor } from '../../hooks/useCursor';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function CustomCursor() {
  const finePointer = useMediaQuery('(pointer: fine)');
  const { cursorRef, ringRef } = useCursor(finePointer);

  if (!finePointer) return null;

  return (
    <>
      <div ref={cursorRef} className="cursor" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
