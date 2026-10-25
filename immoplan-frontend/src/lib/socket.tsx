import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';


function resolveSocketUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit) return explicit;
  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    try {
      return new URL(apiBase).origin;
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

const SOCKET_URL = resolveSocketUrl();

let socketInstance: Socket | null = null;

/** Returns (or creates) the Socket.IO singleton instance. */
export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = localStorage.getItem('access_token');
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: token ?? '' },
      // Polling d’abord : certains réseaux bloquent l’upgrade WebSocket direct.
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });
  }
  return socketInstance;
};

/** Destroy the socket (on logout). */
export const destroySocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }
};

/** Connect with a fresh token (nouveau handshake si le jeton change). */
export const connectSocket = (token: string) => {
  const socket = getSocket();
  if (!token) {
    socket.disconnect();
    return;
  }
  const prev = (socket.auth as { token?: string })?.token;
  socket.auth = { token };
  if (prev === token && socket.connected) {
    return;
  }
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
};

/** À appeler après login / inscription pour rafraîchir le contexte React du socket. */
export const notifySocketAuthChanged = (): void => {
  window.dispatchEvent(new Event('immoplan:token-updated'));
};

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const s = getSocket();
      connectSocket(token);
      setSocket(s);
    }

    const handleTokenUpdated = () => {
      const freshToken = localStorage.getItem('access_token');
      if (freshToken) {
        const s = getSocket();
        connectSocket(freshToken);
        setSocket(s);
      } else {
        destroySocket();
        setSocket(null);
      }
    };

    window.addEventListener('immoplan:token-updated', handleTokenUpdated as EventListener);
    return () => {
      window.removeEventListener('immoplan:token-updated', handleTokenUpdated as EventListener);
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): Socket | null {
  return useContext(SocketContext);
}
