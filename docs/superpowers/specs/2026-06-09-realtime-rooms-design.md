# Realtime Study Rooms — Design Spec

## Goal

Add real-time multiplayer study rooms where users can create password-protected rooms, see each other's session timers live, and chat.

## User Flow

1. Dashboard → "Phòng học" button → `RoomsPage` (lobby)
2. Lobby shows list of existing rooms (name, creator, member count, member avatars)
3. User either:
   - **Creates a room**: enters room name + password → joins immediately as host
   - **Joins a room**: clicks a room → enters password → enters room
4. Inside the room: Pomodoro timer runs as usual, user sees a grid of other members (avatar + name + session time), chat panel on the right
5. Leaving the room records the session (same as current `onExit` flow) and returns to Dashboard

## Architecture

### Transport: Socket.io

Socket.io is added to the existing Express server (`server/src/index.ts`). The HTTP server is shared — Socket.io attaches to the same port (4000). No separate process needed.

### Room Storage: In-Memory

Rooms live in a `Map<roomId, Room>` in server memory. No database table. If the server restarts, all rooms are cleared — this is acceptable for a study tool. A room is automatically deleted when the last member leaves.

### Data Structures

```ts
// Server-side
type RoomMember = {
  socketId: string;
  userId: string;
  userName: string;
  mascotId: string;
  mascotLevel: number;
  sessionSeconds: number; // increments on each timer tick from client
};

type Room = {
  id: string;           // nanoid(8)
  name: string;
  passwordHash: string; // bcrypt hash
  hostId: string;       // userId of creator
  members: Map<string, RoomMember>; // keyed by socketId
  createdAt: Date;
};
```

### Socket Events

| Direction | Event | Payload | Description |
|---|---|---|---|
| client → server | `room:list` | — | Request current room list |
| server → client | `room:list` | `RoomSummary[]` | All active rooms |
| client → server | `room:create` | `{ name, password, userId, userName, mascotId, mascotLevel }` | Create and join a new room |
| client → server | `room:join` | `{ roomId, password, userId, userName, mascotId, mascotLevel }` | Join existing room |
| server → client | `room:joined` | `{ roomId, members: RoomMember[] }` | Confirm join, send full member list |
| server → client | `room:error` | `{ message }` | Wrong password, room not found, etc. |
| client → server | `room:leave` | — | Leave current room |
| server → room | `room:member_joined` | `RoomMember` | Broadcast when someone joins |
| server → room | `room:member_left` | `{ socketId }` | Broadcast when someone leaves |
| client → server | `timer:tick` | — | Sent every second while Pomodoro runs |
| server → room | `timer:update` | `{ socketId, sessionSeconds }` | Broadcast updated time for that member |
| client → server | `chat:send` | `{ text }` | Send a chat message (max 200 chars) |
| server → room | `chat:message` | `{ socketId, userName, text, ts }` | Broadcast to room |

### Authentication on Socket

On connect, client sends the JWT token in the auth handshake:
```ts
// Client
const socket = io('http://localhost:4000', { auth: { token: localStorage.getItem('token') } });
```
Server middleware verifies the JWT on every connection. If invalid, connection is rejected. This prevents unauthenticated users from joining rooms.

## Frontend Components

### `RoomsPage.tsx` (new)
- Fetches room list via `room:list` on mount and subscribes to updates
- Renders rooms as a vertical list (layout B): room name, creator, member count, stacked avatar dots
- "Tạo phòng" button opens `CreateRoomModal`
- Clicking a room opens `JoinRoomModal`

### `CreateRoomModal.tsx` (new)
- Two fields: room name (required, max 50 chars) + password (required, min 4 chars)
- On submit: emits `room:create`

### `JoinRoomModal.tsx` (new)
- Single field: password
- On submit: emits `room:join`
- Shows error from `room:error`

### `FocusRoom.tsx` (modified)
- Accepts optional `roomId` prop. When present, uses socket state instead of mock data.
- Adds chat panel on the right (fixed width 280px on desktop, sheet on mobile)
- Chat input: single line, Enter to send, 200 char limit
- Member grid: same card layout as current mock, but driven by live socket state
- On `timer:tick` (from `PomodoroTimer`'s `onTick`): emits `timer:tick` to server

### `useRoom.ts` (new custom hook)
Encapsulates all socket logic:
- Manages socket connection lifecycle (connect on mount, disconnect on unmount)
- Exposes: `members`, `messages`, `sendMessage`, `leaveRoom`, `roomError`
- Handles reconnect: on socket reconnect, re-emits `room:join` with same credentials

### Dashboard (modified)
- Adds "Phòng học" nav item (or Dock button) that navigates to `RoomsPage`

## Backend Files

### `server/src/lib/rooms.ts` (new)
- In-memory room store with CRUD helpers: `createRoom`, `getRoom`, `listRooms`, `addMember`, `removeMember`, `deleteRoomIfEmpty`

### `server/src/sockets/roomHandlers.ts` (new)
- All Socket.io event handlers for room lifecycle and chat
- JWT auth middleware for socket connections

### `server/src/index.ts` (modified)
- Attach Socket.io to the HTTP server
- Register `roomHandlers`
- Add `socket.io` and `@types/socket.io` as dependencies

## Constraints

- Max 20 members per room (enforced server-side)
- Chat messages: max 200 characters, stripped of HTML
- Passwords: stored as bcrypt hash (cost 10), never sent to clients
- Room names: max 50 characters
- A user can only be in one room at a time (joining a new room auto-leaves the current one)
- `timer:tick` is rate-limited server-side: max 2 ticks/second per socket to prevent flooding

## Out of Scope

- Persistent chat history (messages are lost when all members leave)
- Room discovery/search
- Admin/moderation tools
- Mobile-specific UI (responsive but not native)
