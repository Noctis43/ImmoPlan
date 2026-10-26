import { useCallback } from 'react';
import { useSocketContext } from '../lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket(): Socket | null {
  return useSocketContext();
}

export function useSocketEmit() {
  const socket = useSocketContext();
  return useCallback(
    (event: string, ...args: unknown[]) => {
      socket?.emit(event, ...args);
    },
    [socket]
  );
}
