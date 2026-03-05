import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface WebSocketMessage {
    type: string;
    message?: string;
    platform?: string;
    // Use 'unknown' instead of 'any' to satisfy strict TypeScript rules
    [key: string]: unknown;
}

export function useWebSocket() {
    const { creator, token } = useAuth();
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

    useEffect(() => {
        // Don't try to connect if we aren't fully logged in
        if (!creator || !token) return;

        let reconnectTimer: ReturnType<typeof setTimeout>;
        let isComponentMounted = true;

        // Define the connection logic inside the effect so it can safely call itself
        function connect() {
            // Prevent reconnects if the user navigated away
            if (!isComponentMounted || !creator || !token) return;

            const wsUrl = `${import.meta.env.VITE_WS_URL}/${creator.id}?token=${token}`;

            // Clean up existing connection
            if (ws.current) {
                ws.current.close();
            }

            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('WebSocket Connected!');
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    console.log('WebSocket Message Received:', data);
                    setLastMessage(data);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            socket.onclose = () => {
                console.log('WebSocket Disconnected');
                setIsConnected(false);

                // Auto-reconnect after 3 seconds if the component is still mounted and user is logged in
                if (isComponentMounted && localStorage.getItem('token')) {
                    reconnectTimer = setTimeout(() => {
                        console.log('Attempting to reconnect...');
                        connect();
                    }, 3000);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                socket.close(); // Force a close to trigger the reconnect logic
            };

            ws.current = socket;
        }

        // Initiate the first connection
        connect();

        // Cleanup function when the component unmounts or auth state changes
        return () => {
            isComponentMounted = false;
            clearTimeout(reconnectTimer);
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [creator, token]);

    const clearMessage = useCallback(() => {
        setLastMessage(null);
    }, []);

    return { isConnected, lastMessage, clearMessage };
}