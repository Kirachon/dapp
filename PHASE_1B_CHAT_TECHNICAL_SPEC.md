# Phase 1B Technical Specification: Real-Time Chat System
## LoveConnect - Mock Data Elimination (5 days)

**Priority:** CRITICAL  
**Timeline:** 5 days  
**Effort:** 40 developer hours  
**Dependencies:** Existing GraphQL backend, WebSocket infrastructure setup

---

## 🎯 **OBJECTIVE**

Replace hardcoded mock messages and user data in the chat system with real GraphQL integration, implementing WebSocket subscriptions for real-time messaging, message status indicators, and offline message handling.

---

## 📋 **CURRENT STATE ANALYSIS**

### **Problem Identification:**
- **File:** `frontend/src/app/chat/[id]/page.tsx`
- **Lines:** 38-74 (Mock chat data)
- **Issue:** All conversations show fake messages instead of real chat history

### **Mock Data Structure:**
```typescript
// CURRENT MOCK DATA (TO BE REMOVED)
setChatUser({
  id: params.id as string,
  name: 'Sarah Johnson',
  avatar: '/placeholder-avatar.png',
  isOnline: true,
  lastSeen: new Date()
});

setMessages([
  {
    id: '1',
    senderId: params.id as string,
    content: 'Hey! How are you doing? 😊',
    type: 'text',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read'
  },
  // ... more mock messages
]);
```

### **Existing GraphQL Infrastructure:**
```typescript
// ✅ AVAILABLE: Basic messages resolver exists
const GET_MESSAGES_QUERY = gql`
  query GetMessages($conversationId: ID!, $page: Int, $pageSize: Int) {
    messages(conversationId: $conversationId, page: $page, pageSize: $pageSize) {
      id
      content
      senderId
      createdAt
      status
      type
    }
  }
`;

// ❌ MISSING: Real-time subscriptions and WebSocket support
```

---

## 🔧 **IMPLEMENTATION PLAN**

### **Day 1: WebSocket Infrastructure Setup (8 hours)**

#### **Task 1.1: Backend WebSocket Server (4 hours)**
```typescript
// NEW: WebSocket server setup in backend
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const httpServer = createServer(app);
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer(
  {
    schema,
    context: async (ctx) => {
      // Authentication context for WebSocket
      return {
        user: await authenticateWebSocket(ctx.connectionParams?.authorization),
        prisma,
      };
    },
  },
  wsServer
);
```

#### **Task 1.2: GraphQL Subscription Schema (2 hours)**
```typescript
// NEW: Subscription type definitions
const typeDefs = gql`
  type Subscription {
    messageAdded(conversationId: ID!): Message
    messageStatusUpdated(conversationId: ID!): Message
    userTyping(conversationId: ID!): TypingIndicator
    userOnlineStatus(userId: ID!): OnlineStatus
  }

  type TypingIndicator {
    userId: ID!
    conversationId: ID!
    isTyping: Boolean!
  }

  type OnlineStatus {
    userId: ID!
    isOnline: Boolean!
    lastSeen: DateTime
  }
`;
```

#### **Task 1.3: PubSub Integration (2 hours)**
```typescript
// NEW: Redis PubSub for scalable real-time messaging
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const pubsub = new RedisPubSub({
  publisher: redis,
  subscriber: redis,
});

// Message events
const MESSAGE_ADDED = 'MESSAGE_ADDED';
const MESSAGE_STATUS_UPDATED = 'MESSAGE_STATUS_UPDATED';
const USER_TYPING = 'USER_TYPING';
const USER_ONLINE_STATUS = 'USER_ONLINE_STATUS';
```

### **Day 2: GraphQL Subscription Resolvers (8 hours)**

#### **Task 2.1: Message Subscription Resolver (4 hours)**
```typescript
// NEW: Real-time message subscription
const subscriptionResolvers = {
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([MESSAGE_ADDED]),
        (payload, variables, context) => {
          // Ensure user has access to this conversation
          return payload.messageAdded.conversationId === variables.conversationId &&
                 hasConversationAccess(context.user.id, variables.conversationId);
        }
      ),
    },
    
    messageStatusUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([MESSAGE_STATUS_UPDATED]),
        (payload, variables, context) => {
          return payload.messageStatusUpdated.conversationId === variables.conversationId &&
                 hasConversationAccess(context.user.id, variables.conversationId);
        }
      ),
    },
  },
};
```

#### **Task 2.2: Send Message Mutation Enhancement (2 hours)**
```typescript
// ENHANCED: Send message with real-time publishing
const sendMessage = async (parent, args, context) => {
  const { conversationId, content, type = 'text' } = args;
  const { user, prisma } = context;

  // Validate conversation access
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId: user.id } }
    }
  });

  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: user.id,
      content,
      type,
      status: 'SENT',
    },
    include: {
      sender: { include: { profile: true } }
    }
  });

  // Publish to subscribers
  await pubsub.publish(MESSAGE_ADDED, {
    messageAdded: message,
  });

  // Update conversation last message
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { 
      lastMessageAt: new Date(),
      lastMessageId: message.id,
    }
  });

  return message;
};
```

#### **Task 2.3: Typing Indicators (2 hours)**
```typescript
// NEW: Typing indicator system
const setTypingStatus = async (parent, args, context) => {
  const { conversationId, isTyping } = args;
  const { user } = context;

  const typingIndicator = {
    userId: user.id,
    conversationId,
    isTyping,
  };

  await pubsub.publish(USER_TYPING, {
    userTyping: typingIndicator,
  });

  return typingIndicator;
};
```

### **Day 3: Frontend WebSocket Integration (8 hours)**

#### **Task 3.1: Apollo Client WebSocket Setup (3 hours)**
```typescript
// NEW: WebSocket link configuration
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => ({
      authorization: `Bearer ${getAuthToken()}`,
    }),
    retryAttempts: 5,
    shouldRetry: () => true,
  })
);

// Split link for queries/mutations vs subscriptions
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);
```

#### **Task 3.2: Real-Time Message Subscription (3 hours)**
```typescript
// NEW: Real-time message subscription in chat component
const MESSAGE_SUBSCRIPTION = gql`
  subscription OnMessageAdded($conversationId: ID!) {
    messageAdded(conversationId: $conversationId) {
      id
      content
      senderId
      createdAt
      status
      type
      sender {
        id
        profile {
          firstName
          photos
        }
      }
    }
  }
`;

// Component implementation
const { data: subscriptionData } = useSubscription(MESSAGE_SUBSCRIPTION, {
  variables: { conversationId: chatId },
  onSubscriptionData: ({ subscriptionData }) => {
    if (subscriptionData.data?.messageAdded) {
      const newMessage = subscriptionData.data.messageAdded;
      
      // Add to messages list if not already present
      setMessages(prev => {
        const exists = prev.find(msg => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    }
  },
});
```

#### **Task 3.3: Remove Mock Data and Integrate Real Data (2 hours)**
```typescript
// REMOVE: All mock data (Lines 38-74)
// REPLACE WITH: Real GraphQL queries

const { data: messagesData, loading, error, fetchMore } = useQuery(GET_MESSAGES_QUERY, {
  variables: { 
    conversationId: chatId,
    page: 1,
    pageSize: 50 
  },
  skip: !chatId,
  notifyOnNetworkStatusChange: true,
});

const { data: conversationData } = useQuery(GET_CONVERSATION_QUERY, {
  variables: { conversationId: chatId },
  skip: !chatId,
});

// Set real data
useEffect(() => {
  if (messagesData?.messages) {
    setMessages(messagesData.messages);
  }
}, [messagesData]);

useEffect(() => {
  if (conversationData?.conversation) {
    const otherUser = conversationData.conversation.participants.find(
      p => p.userId !== user?.id
    );
    if (otherUser) {
      setChatUser({
        id: otherUser.userId,
        name: otherUser.user.profile?.firstName || 'Unknown',
        avatar: otherUser.user.profile?.photos?.[0] || '/placeholder-avatar.png',
        isOnline: otherUser.user.isOnline || false,
        lastSeen: otherUser.user.lastActiveAt,
      });
    }
  }
}, [conversationData, user]);
```

### **Day 4: Message Status and Typing Indicators (8 hours)**

#### **Task 4.1: Message Status System (4 hours)**
```typescript
// NEW: Message status tracking
const MESSAGE_STATUS_SUBSCRIPTION = gql`
  subscription OnMessageStatusUpdated($conversationId: ID!) {
    messageStatusUpdated(conversationId: $conversationId) {
      id
      status
    }
  }
`;

// Status update mutation
const UPDATE_MESSAGE_STATUS = gql`
  mutation UpdateMessageStatus($messageId: ID!, $status: MessageStatus!) {
    updateMessageStatus(messageId: $messageId, status: $status) {
      id
      status
    }
  }
`;

// Component implementation
const [updateMessageStatus] = useMutation(UPDATE_MESSAGE_STATUS);

// Mark messages as read when viewed
useEffect(() => {
  const unreadMessages = messages.filter(
    msg => msg.senderId !== user?.id && msg.status !== 'READ'
  );
  
  unreadMessages.forEach(msg => {
    updateMessageStatus({
      variables: { messageId: msg.id, status: 'READ' }
    });
  });
}, [messages, user, updateMessageStatus]);
```

#### **Task 4.2: Typing Indicators (4 hours)**
```typescript
// NEW: Typing indicator system
const TYPING_SUBSCRIPTION = gql`
  subscription OnUserTyping($conversationId: ID!) {
    userTyping(conversationId: $conversationId) {
      userId
      isTyping
    }
  }
`;

const SET_TYPING_STATUS = gql`
  mutation SetTypingStatus($conversationId: ID!, $isTyping: Boolean!) {
    setTypingStatus(conversationId: $conversationId, isTyping: $isTyping) {
      userId
      isTyping
    }
  }
`;

// Component implementation
const [setTypingStatus] = useMutation(SET_TYPING_STATUS);
const [otherUserTyping, setOtherUserTyping] = useState(false);

// Typing subscription
useSubscription(TYPING_SUBSCRIPTION, {
  variables: { conversationId: chatId },
  onSubscriptionData: ({ subscriptionData }) => {
    const typingData = subscriptionData.data?.userTyping;
    if (typingData && typingData.userId !== user?.id) {
      setOtherUserTyping(typingData.isTyping);
      
      // Clear typing indicator after 3 seconds
      if (typingData.isTyping) {
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    }
  },
});

// Input change handler
const handleInputChange = useCallback(
  debounce((value: string) => {
    const isTyping = value.length > 0;
    setTypingStatus({
      variables: { conversationId: chatId, isTyping }
    });
  }, 300),
  [chatId, setTypingStatus]
);
```

### **Day 5: Offline Support and Testing (8 hours)**

#### **Task 5.1: Offline Message Queuing (4 hours)**
```typescript
// NEW: Offline message support
const useOfflineMessageQueue = () => {
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueMessage = useCallback((message: QueuedMessage) => {
    setMessageQueue(prev => [...prev, message]);
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || messageQueue.length === 0) return;

    for (const queuedMessage of messageQueue) {
      try {
        await sendMessage({
          variables: {
            conversationId: queuedMessage.conversationId,
            content: queuedMessage.content,
            type: queuedMessage.type,
          }
        });
        
        setMessageQueue(prev => prev.filter(msg => msg.id !== queuedMessage.id));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        break; // Stop processing on error
      }
    }
  }, [isOnline, messageQueue, sendMessage]);

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return { queueMessage, isOnline, queuedCount: messageQueue.length };
};
```

#### **Task 5.2: Connection Recovery (2 hours)**
```typescript
// NEW: WebSocket connection recovery
const useWebSocketConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const client = getApolloClient();
    
    // Monitor WebSocket connection
    const wsLink = client.link as any;
    if (wsLink.subscriptionClient) {
      wsLink.subscriptionClient.on('connected', () => {
        setConnectionStatus('connected');
        setRetryCount(0);
      });

      wsLink.subscriptionClient.on('disconnected', () => {
        setConnectionStatus('disconnected');
      });

      wsLink.subscriptionClient.on('reconnecting', () => {
        setConnectionStatus('connecting');
        setRetryCount(prev => prev + 1);
      });
    }
  }, []);

  return { connectionStatus, retryCount };
};
```

#### **Task 5.3: End-to-End Testing (2 hours)**
```typescript
// NEW: Comprehensive chat testing
describe('Real-Time Chat System', () => {
  it('sends and receives messages in real-time', async () => {
    // Test real-time message delivery
  });

  it('shows typing indicators', async () => {
    // Test typing indicator functionality
  });

  it('handles offline message queuing', async () => {
    // Test offline support
  });

  it('recovers from connection loss', async () => {
    // Test connection recovery
  });

  it('updates message status correctly', async () => {
    // Test message status tracking
  });
});
```

---

## ✅ **ACCEPTANCE CRITERIA**

### **Functional Requirements:**
- [ ] Mock data completely removed from chat components
- [ ] Real messages display from GraphQL API
- [ ] Real-time message delivery functional
- [ ] Message status indicators working (sent, delivered, read)
- [ ] Typing indicators functional
- [ ] Offline message queuing working
- [ ] Connection recovery automatic

### **Technical Requirements:**
- [ ] WebSocket subscriptions implemented
- [ ] GraphQL resolvers for real-time features
- [ ] Redis PubSub integration
- [ ] Authentication for WebSocket connections
- [ ] Error handling and retry logic
- [ ] Performance optimization for message loading

### **Quality Requirements:**
- [ ] No memory leaks in subscriptions
- [ ] Smooth real-time experience
- [ ] Proper cleanup on component unmount
- [ ] Accessibility maintained
- [ ] Mobile-responsive design preserved

---

## 📊 **SUCCESS METRICS**

### **Performance Targets:**
- Message delivery latency: <500ms
- Connection establishment: <2 seconds
- Message history loading: <1 second
- Typing indicator response: <200ms

### **Reliability Targets:**
- Connection uptime: >99%
- Message delivery success: >99.9%
- Offline queue success: >95%
- Error recovery: <10 seconds

**Status:** ✅ **SPECIFICATION COMPLETE** - Ready for implementation  
**Next Action:** Begin Day 1 - WebSocket Infrastructure Setup
