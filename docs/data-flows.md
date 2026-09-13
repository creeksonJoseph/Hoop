# Data & Message Flows

This document details the step-by-step data flows, network communication protocols, and sequence diagrams for key user interactions in **Hooop**.

---

## 1. Initial Message Loading Flow (DB-First + Background Cursor Fetch)

To make chat loading feel instant, Hooop immediately reads stored messages from Supabase DB on open, while requesting the pagination cursor from Zernio in the background.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React App (useMessages)
    participant Router as FastAPI (/api/chat/messages)
    participant Repo as Message Repository
    participant DB as Supabase PostgreSQL
    participant Zernio as Zernio API Proxy

    User->>Frontend: Selects DM Conversation
    Frontend->>Router: GET /api/chat/messages?account_id=...&username=...
    
    rect rgb(240, 248, 255)
        note right of Router: Step A: Fast DB Read (<100ms)
        Router->>Repo: fetch_local_messages(account_id, limit=50)
        Repo->>DB: SELECT * FROM messages WHERE account_id=... ORDER BY timestamp DESC
        DB-->>Repo: Return stored messages
        Repo-->>Router: Return message objects
    end

    rect rgb(255, 248, 240)
        note right of Router: Step B: Background Cursor Fetch
        Router->>Zernio: GET /conversations/find + /messages (cursor inquiry)
        Zernio-->>Router: Returns Zernio cursor + recent batch
        Router->>Repo: sync_new_messages_to_db(...)
        Repo->>DB: UPSERT new messages
    end

    Router-->>Frontend: HTTP 200 { messages: [...], nextCursor: "zernio_cursor_abc", hasMore: true }
    Frontend->>Frontend: Render initial messages & scroll to bottom
```

---

## 2. Scroll-Up Pagination Flow (Older Message Loading)

When a user scrolls to the top of the chat view, Hooop uses the stored cursor to fetch older messages directly from Zernio and prepends them seamlessly.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant ChatView as ChatView Component
    participant Hook as useMessages Hook
    participant Router as FastAPI (/api/chat/messages)
    participant Zernio as Zernio API Proxy

    User->>ChatView: Scrolls to top of message list (scrollTop == 0)
    ChatView->>Hook: Trigger loadMore()
    
    note over Hook: Guard check: isFetching == false && hasMore == true && cursor != null
    Hook->>ChatView: Capture prevScrollHeight = container.scrollHeight
    Hook->>Router: GET /api/chat/messages?cursor=zernio_cursor_abc&limit=50
    
    Router->>Zernio: GET /conversations/messages?cursor=zernio_cursor_abc
    Zernio-->>Router: Return older message batch + new_cursor_xyz
    Router-->>Hook: HTTP 200 { messages: [older1, older2], nextCursor: "new_cursor_xyz", hasMore: true }
    
    note over Hook: Deduplicate using seenIds set
    Hook->>Hook: setMessages(prev => [...newOlderMsgs, ...prev])
    
    ChatView->>ChatView: Adjust scroll position: scrollTop = newScrollHeight - prevScrollHeight
    note right of ChatView: User maintains precise visual scroll anchor!
```

---

## 3. Realtime Message Updates Flow (Supabase Realtime)

Incoming DMs and sent message confirmations stream instantly to the client over WebSockets without polling.

```mermaid
sequenceDiagram
    autonumber
    participant Zernio as Zernio Webhook Provider
    participant Router as FastAPI Webhook (/api/webhook)
    participant DB as Supabase PostgreSQL
    participant Realtime as Supabase Realtime Server
    participant Client as React Client (useRealtime Hook)

    Client->>Realtime: Subscribe to channel ("messages:account_id=XYZ")
    Realtime-->>Client: Channel SUBSCRIBED status
    
    Note over Zernio, Router: New DM arrives from Instagram
    Zernio->>Router: POST /api/webhook (New Message Payload)
    Router->>DB: INSERT INTO messages (id, account_id, text, sender_id, ...)
    
    DB->>Realtime: PostgreSQL WAL Replication (INSERT event)
    Realtime->>Client: WebSocket Message Payload { event: 'INSERT', new: { ... } }
    
    note over Client: Check seenIds.has(payload.new.id)
    alt New Message (not in UI)
        Client->>Client: Append message to chat & smooth scroll to bottom
    else Message already added optimistically
        Client->>Client: Replace optimistic message with confirmed payload
    end
```

---

## 4. Message Sending & Optimistic UI Flow

When a user types a reply and presses Enter, the UI instantly displays the message before network confirmation.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React Client (useActions)
    participant Router as FastAPI (/api/chat/reply)
    participant Zernio as Zernio API Proxy
    participant DB as Supabase PostgreSQL

    User->>Frontend: Enters message & hits Enter
    note over Frontend: Generate optimistic msg: { id: "opt_1234", text: "Hello!", status: "sending" }
    Frontend->>Frontend: Append optimistic message immediately & scroll down
    
    Frontend->>Router: POST /api/chat/reply { account_id, recipient_id, text }
    Router->>Zernio: POST /conversations/send { text, recipient_id }
    Zernio-->>Router: HTTP 200 { message_id: "zernio_real_999" }
    
    Router->>DB: INSERT INTO messages (zernio_msg_id, text, ...)
    Router-->>Frontend: HTTP 200 { status: "sent", message: { id: "zernio_real_999", ... } }
    
    Frontend->>Frontend: Replace "opt_1234" with confirmed message ID "zernio_real_999"
```

---

## 5. Wingman Session Flow (Helping a Friend Out)

When a user runs out of words, they can invite a wingman using a secure guest token.

```mermaid
sequenceDiagram
    autonumber
    actor User as Main User
    actor Guest as Wingman (Friend)
    participant Frontend as React Frontend
    participant Router as FastAPI (/api/wingman/*)
    participant DB as Supabase Database

    User->>Frontend: Click "Invite Wingman" on a DM
    Frontend->>Router: POST /api/sessions/create { account_id, duration: "24h" }
    Router->>DB: INSERT INTO wingman_sessions (token, user_id, expires_at)
    Router-->>User: Shareable Link: `https://hooop.app/wingman/token_xyz123`
    
    Guest->>Frontend: Opens Wingman Shareable Link
    Frontend->>Router: GET /api/wingman/token_xyz123/messages
    Router->>DB: Validate token expiration & fetch conversation
    Router-->>Guest: Return chat thread (Read-only or Reply mode)
    
    Guest->>Frontend: Submits suggested reply
    Frontend->>Router: POST /api/wingman/token_xyz123/reply { text: "Try this line!" }
    Router->>Router: Execute reply via owner's connected Instagram key
    Router-->>Guest & User: Message sent to Instagram thread!
```
