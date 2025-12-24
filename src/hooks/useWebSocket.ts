// src/hooks/useWebSocket.ts
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import type { WSMessage } from "@/lib/websocket/types";
import type { ChatMessage } from "@/types/chat";

interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: "message" | "appointment" | "payment" | "profile_visit";
  content: string;
  timestamp: string;
  unread: string;
  unreadBool: boolean;
  relatedId?: string;
}

interface UseWebSocketOptions {
  conversationId?: string;
  onMessage?: (data: WSMessage) => void;
  onNewMessage?: (message: ChatMessage) => void;
  onTyping?: (userId: string) => void;
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onOnlineStatusChange?: (userId: string, isOnline: boolean) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  send: (data: object) => void;
  sendTyping: () => void;
  joinConversation: (conversationId: string) => void;
  sendNotification: (
    targetUserId: string,
    type: Notification["type"],
    content: string,
    relatedId?: string
  ) => void;
  sendHeartbeat: () => void;
  reconnect: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
const RECONNECT_INTERVAL = 3000;
const PING_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
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
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    onOnlineStatusChange,
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
      wsRef.current.onclose = null;
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

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ action: "ping", userId: session?.user?.id })
            );
          }
        }, PING_INTERVAL);

        if (conversationId) {
          ws.send(JSON.stringify({ action: "join", conversationId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage & {
            isOnline?: boolean;
          };
          console.log("WebSocket: Received", data.type);

          onMessage?.(data);

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
            case "notification":
              if (data.notification) {
                onNotification?.(data.notification as Notification);
              }
              break;
            case "onlineStatus":
              if (data.userId !== undefined && data.isOnline !== undefined) {
                onOnlineStatusChange?.(data.userId, data.isOnline);
              }
              break;
            case "pong":
            case "heartbeatAck":
              // Heartbeat acknowledged
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

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

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
    session?.user?.id,
    conversationId,
    enabled,
    cleanup,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onNewMessage,
    onTyping,
    onNotification,
    onOnlineStatusChange,
  ]);

  // Send function
  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket: Cannot send, not connected");
    }
  }, []);

  // Send typing indicator
  const lastTypingSentRef = useRef(0);
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;

    lastTypingSentRef.current = now;
    send({
      action: "typing",
      conversationId,
      userId: session?.user?.id,
    });
  }, [send, conversationId, session?.user?.id]);

  // Join a conversation
  const joinConversation = useCallback(
    (convId: string) => {
      send({ action: "join", conversationId: convId });
    },
    [send]
  );

  // Send notification via WebSocket
  const sendNotification = useCallback(
    (
      targetUserId: string,
      type: Notification["type"],
      content: string,
      relatedId?: string
    ) => {
      send({
        action: "notification",
        targetUserId,
        type,
        content,
        senderId: session?.user?.id,
        relatedId,
      });
    },
    [send, session?.user?.id]
  );

  // Send heartbeat to update online status
  const sendHeartbeat = useCallback(() => {
    send({
      action: "heartbeat",
      userId: session?.user?.id,
    });
  }, [send, session?.user?.id]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount
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
    sendNotification,
    sendHeartbeat,
    reconnect,
  };
}
