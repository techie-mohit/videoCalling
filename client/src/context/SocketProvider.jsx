import React from 'react'
import { useContext } from 'react';
import { useMemo } from 'react';
import { createContext } from 'react'
import { io } from 'socket.io-client';
import { useAuth } from './AuthProvider.jsx';

const SocketContext = createContext(null);

export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket;
}

const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SocketProvider = (props) => {
    const { token } = useAuth();

    const socket = useMemo(() => io(url, {
        auth: {
            token: token
        }
    }), [token])
  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  )
}

export default SocketProvider