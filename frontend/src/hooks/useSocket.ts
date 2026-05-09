import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export const useSocket = (area?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socketInstance;

    const onConnect = () => {
      setIsConnected(true);
      if (area) {
        socketInstance.emit('join_area', area);
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [area]);

  // Envolvemos el acceso al socket en una función para que los componentes puedan obtenerlo
  // en event handlers sin violar la regla de leer refs durante el render (Next 15 / React 19).
  const getSocket = () => socketRef.current;

  return { getSocket, isConnected };
};
