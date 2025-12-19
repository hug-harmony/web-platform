// lambda/types.ts
export interface ConnectionRecord {
  connectionId: string;
  odI: string;
  visibleConversationId: string; // Current active conversation
  conversationIds: string[]; // All conversations user has access to
  connectedAt: number;
  ttl: number;
}

export interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    eventType: string;
    domainName: string;
    stage: string;
  };
  queryStringParameters?: Record<string, string>;
  body?: string;
}

export interface WebSocketMessage {
  action: string;
  conversationId?: string;
  message?: unknown;
  odI?: string;
}
