// hooks/useWebSocket.ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import type { WSMessage } from "@/lib/websocket/types";
import type { ChatMessage } from "@/types/chat";

interface UseWebSocketOptions {
  conversationId?: string;
  onMessage?: (data: WSMessage) => void;
  onNewMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  send: (data: object) => void;
  sendTyping: () => void;
  joinConversation: (conversationId: string) => void;
  reconnect: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { data: session, status } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const {
    conversationId,
    onMessage,
    onNewMessage,
    onTyping,
    onConnect,
    onDisconnect,
    onError,
    enabled = true,
  } = options;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!WS_URL || !session?.accessToken || !enabled) {
      console.log("WebSocket: Missing requirements", {
        WS_URL: !!WS_URL,
        session: !!session?.accessToken,
        enabled,
      });
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket: Already connected");
      return;
    }

    // Clean up any existing connection
    cleanup();

    try {
      const url = new URL(WS_URL);
      url.searchParams.set("token", session.accessToken as string);
      if (conversationId) {
        url.searchParams.set("conversations", conversationId);
      }

      console.log(
        "WebSocket: Connecting to",
        url.toString().replace(/token=[^&]+/, "token=***")
      );
      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        console.log("WebSocket: Connected");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }));
          }
        }, PING_INTERVAL);

        // Join conversation if specified
        if (conversationId) {
          ws.send(JSON.stringify({ action: "join", conversationId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage;
          console.log("WebSocket: Received", data.type);

          // Call generic handler
          onMessage?.(data);

          // Call specific handlers
          switch (data.type) {
            case "newMessage":
              if (data.message) {
                onNewMessage?.(data.message as ChatMessage);
              }
              break;
            case "typing":
              if (data.userId) {
                onTyping?.(data.userId);
              }
              break;
            case "pong":
              // Keep-alive response, ignore
              break;
            case "error":
              console.error("WebSocket: Server error", data.error);
              setConnectionError(data.error || "Server error");
              break;
          }
        } catch (parseError) {
          console.error("WebSocket: Failed to parse message", parseError);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket: Disconnected", {
          code: event.code,
          reason: event.reason,
        });
        setIsConnected(false);
        onDisconnect?.();

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if not intentionally closed
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay =
            RECONNECT_INTERVAL *
            Math.pow(1.5, reconnectAttemptsRef.current - 1);
          console.log(
            `WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError("Max reconnection attempts reached");
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket: Error", event);
        setConnectionError("Connection error");
        onError?.(event);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket: Connection failed", error);
      setConnectionError("Failed to connect");
    }
  }, [
    session?.accessToken,
    conversationId,
    enabled,
    cleanup,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onNewMessage,
    onTyping,
  ]);

  // Send function
  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket: Cannot send, not connected");
    }
  }, []);

  // Send typing indicator (debounced internally)
  const lastTypingSentRef = useRef(0);
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return; // Debounce 2 seconds

    lastTypingSentRef.current = now;
    send({
      action: "typing",
      conversationId,
      userId: session?.user?.id,
    });
  }, [send, conversationId, session?.user?.id]);

  // Join a specific conversation
  const joinConversation = useCallback(
    (convId: string) => {
      send({ action: "join", conversationId: convId });
    },
    [send]
  );

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    if (status === "authenticated" && enabled) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [status, enabled, connect, cleanup]);

  // Reconnect when conversationId changes
  useEffect(() => {
    if (isConnected && conversationId) {
      send({ action: "join", conversationId });
    }
  }, [conversationId, isConnected, send]);

  return {
    isConnected,
    connectionError,
    send,
    sendTyping,
    joinConversation,
    reconnect,
  };
}
