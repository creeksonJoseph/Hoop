# REST API Reference

All backend endpoints are prefixed with `/api`. Protected endpoints require a valid JWT token in the `Authorization` request header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## 📑 Complete Endpoint Summary Table

| Category | Method | Endpoint | Auth Required | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | No | Register a new user account |
| **Auth** | `POST` | `/api/auth/login` | No | Authenticate user & return JWT token |
| **Auth** | `GET` | `/api/auth/me` | Yes | Get currently authenticated user profile |
| **Home** | `GET` | `/api/home/dms` | Yes | Fetch list of active DM threads across accounts |
| **Home** | `GET` | `/api/home/stats` | Yes | Fetch user dashboard analytics and DM metrics |
| **Home** | `GET` | `/api/home/quick-actions` | Yes | Fetch suggested quick actions for incoming DMs |
| **Chat** | `GET` | `/api/chat/messages` | Yes | Fetch messages with DB-first cache & Zernio pagination |
| **Chat** | `POST` | `/api/chat/reply` | Yes | Send a reply message to an Instagram DM thread |
| **Chat** | `DELETE` | `/api/chat/messages/{id}` | Yes | Delete a specific message from history |
| **Wingman** | `GET` | `/api/wingman/{token}` | No | Validate a wingman share token & get session metadata |
| **Wingman** | `GET` | `/api/wingman/{token}/messages` | No | Fetch message thread for guest wingman |
| **Wingman** | `POST` | `/api/wingman/{token}/reply` | No | Send a guest reply via wingman session token |
| **Sessions** | `POST` | `/api/sessions/` | Yes | Create a new shareable wingman session token |
| **Sessions** | `GET` | `/api/sessions/` | Yes | List active wingman session tokens for user |
| **Sessions** | `DELETE` | `/api/sessions/{id}` | Yes | Revoke an active wingman session token |
| **Onboarding** | `POST` | `/api/onboarding/connect` | Yes | Connect an Instagram API key directly (BYOK) |
| **Onboarding** | `GET` | `/api/onboarding/connect/instagram` | Yes | Get OAuth URL for Instagram connection |
| **Onboarding** | `GET` | `/api/onboarding/callback` | No | OAuth return callback from Zernio/Instagram |
| **Settings** | `GET` | `/api/settings/profile` | Yes | Fetch user account settings |
| **Settings** | `PUT` | `/api/settings/profile` | Yes | Update user profile details |
| **Settings** | `GET` | `/api/settings/accounts` | Yes | List connected social accounts & status |
| **Settings** | `DELETE` | `/api/settings/accounts/{id}` | Yes | Disconnect an account and delete its keys |

---

## 🔍 Detailed Endpoint Specifications

### 1. Chat Messages (`GET /api/chat/messages`)

Fetch messages for an active conversation thread.

#### Query Parameters:
- `account_id` *(string, optional)*: UUID of the connected account.
- `username` *(string, optional)*: Recipient Instagram handle.
- `cursor` *(string, optional)*: Pagination cursor string returned from a previous response.
- `limit` *(int, default=50)*: Number of messages to fetch.

#### Success Response (`200 OK`):
```json
{
  "messages": [
    {
      "id": "msg_99812",
      "account_id": "8f3b...",
      "sender_id": "instagram_user_123",
      "recipient_id": "my_account_456",
      "text": "Hey! Loved your story post earlier.",
      "timestamp": "2026-09-13T09:30:00Z",
      "is_outgoing": false
    }
  ],
  "nextCursor": "zernio_cursor_ey...",
  "hasMore": true
}
```

---

### 2. Send Chat Reply (`POST /api/chat/reply`)

Send a reply to an Instagram DM thread.

#### Request Body:
```json
{
  "account_id": "8f3b...",
  "recipient_id": "instagram_user_123",
  "text": "Thanks! Really appreciate it 🙏"
}
```

#### Success Response (`200 OK`):
```json
{
  "status": "sent",
  "message": {
    "id": "zernio_real_10482",
    "account_id": "8f3b...",
    "sender_id": "my_account_456",
    "recipient_id": "instagram_user_123",
    "text": "Thanks! Really appreciate it 🙏",
    "timestamp": "2026-09-13T10:15:00Z",
    "is_outgoing": true
  }
}
```

---

### 3. Wingman Session Reply (`POST /api/wingman/{token}/reply`)

Send a message on behalf of the account owner using a valid guest wingman token.

#### Request Body:
```json
{
  "text": "Here is a great line you can send!"
}
```

#### Success Response (`200 OK`):
```json
{
  "status": "sent",
  "token": "token_xyz123",
  "message_id": "zernio_real_10483"
}
```
