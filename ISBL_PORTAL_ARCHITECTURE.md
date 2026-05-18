# ISBL Portal - System Architecture & Wiring Report

This document is designed to serve as a comprehensive context bridge for AI assistants or new developers working on the **In-Silico Biophysics Lab (ISBL) Portal**. It outlines "what does what" and how the frontend, backend, database, and real-time sockets are wired together.

## 1. Tech Stack Overview
*   **Frontend**: Vanilla HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (via CDN), Lucide Icons.
*   **Backend**: Node.js, Express.js.
*   **Real-time**: Socket.IO (Client & Server).
*   **Database**: SQLite (via `better-sqlite3`), using WAL (Write-Ahead Logging) mode.
*   **Authentication**: Custom JWT (JSON Web Tokens) with stateless validation + persistent SQLite session tracking.

---

## 2. Codebase Structure & "What Does What"

### `client/` (Frontend)
The frontend acts as a lightweight SPA (Single Page Application). It doesn't use a framework like React or Vue, relying instead on data attributes and DOM manipulation in Vanilla JS.
*   **Pages**:
    *   `index.html`: Entry point. Handles Team/Admin landing and login forms.
    *   `dashboard.html`: The Team Member view. Contains tabs for Home, Tasks, Docs, Meetings, Team.
    *   `admin.html`: The Admin view. Contains tabs for Overview, Manage Members, Task Manager, Docs, Meetings.
*   **`client/js/` (Modules)**:
    *   `app.js`: The central orchestrator. Checks `data-page` on the body and initializes respective frontend scripts (Index, Admin, or Dashboard).
    *   `auth.js`: Handles login submissions. Stores the JWT token in `localStorage`, handles logout, and redirects.
    *   `api.js`: A lightweight wrapper around the `fetch` API. Automatically attaches the `Authorization: Bearer <token>` header to all REST requests.
    *   `realtime.js`: The Socket.IO connection manager. Connects to the backend holding the JWT, handles connection logic, and distributes event callbacks.
    *   `ui.js`: DOM utilities (toasts, tab switching, form error handling, screen switching).
    *   `members.js`: Handles Admin workflows for adding/updating members and Team dashboard rendering of the lab directory.
    *   `tasks.js`: **Admin only**. Renders the interactive Task Manager where admins can assign, remove, and reassign tasks.
    *   `memberTasks.js`: **Member only**. Subscribes to the member's specific tasks via WebSockets and renders a read-only list.

### `server/` (Backend)
*   **`server.js`**: The Express HTTP server setup. Integrates the REST API routes and binds the Socket.IO server.
*   **`socket.js`**: **(The Core Real-time Wiring)** Holds the Socket.IO instance and definitions for client events. Validates JWT upon socket connection.
*   **`database/`**:
    *   `db.js`: Initializes `better-sqlite3`. Enables WAL mode for concurrent reads/writes.
    *   `schema.sql`: Contains table definitions for `members`, `tasks`, and `sessions`.
*   **`middleware/`**:
    *   `authMiddleware.js`: Verifies the HTTP Authorization header JWT. Restricts endpoints to logged-in users.
    *   `adminMiddleware.js`: Checks `req.user.role === 'admin'`. Restricts endpoints to admin-only.
*   **`routes/`**:
    *   `authRoutes.js`: Login, logout, testing auth endpoints.
    *   `memberRoutes.js`: REST endpoints for CRUD operations on team members.
    *   `adminRoutes.js`: Endpoints exclusively for Admin settings (e.g. changing passwords).
*   **`utils/`**:
    *   `hash.js`: Scrypt hashing wrapper mapped for robust password encryption.
    *   `jwt.js`: JWT signing/verifying wrappers.

---

## 3. The "Wiring" (How Components Talk to Each Other)

### A. Authentication & Session Wiring
1.  **Login**: User submits form `->` `auth.js` `->` POST `/api/auth/login` (REST).
2.  **Backend generation**: Server checks credentials `->` Creates a record in SQLite `sessions` table `->` Signs a JWT containing `{ role, memberId, jti }` `->` returns to client.
3.  **Persistence**: `auth.js` saves the token to `localStorage` (`isbl_token`).
4.  **Subsequent Auth HTTP**: `api.js` intercepts REST calls and appends `Authorization: Bearer <token>`.
5.  **Subsequent Auth WebSockets**: `realtime.js` passes the token in `auth: { token: ... }`. `server/socket.js` intercepts the connection, validates the JWT, checks if the session is revoked in the SQLite DB, and only then allows connection.

### B. Real-time Broadcasting & Room Wiring
Socket.IO utilizes "Rooms" to securely isolate network traffic:
*   **`admins` Room**:
    *   Admins join this room upon connection.
    *   They receive broadcast events like `tasks_update` (containing *all* tasks) and member directory changes.
*   **`members` Room**:
    *   General team members join this room to get broadcast events like `member-added` or `member-removed` (used to update the live team roster).
*   **`member:{id}` Room**:
    *   Every team member individually joins a unique room tailored to their ID (e.g., `member:4`).
    *   **The Tasks mechanism relies heavily on this:** When an admin creates or reassigns a task, `socket.js` queries exactly which tasks belong to that specific `memberId` and emits `tasks_update_member` strictly to `member:{id}`. The client `memberTasks.js` listens to this event to render personal tasks.

### C. State Synchronization (Database -> Socket -> DOM)
There is a standardized synchronization loop used throughout the app:
1.  **Action (Admin)**: The admin performs an action via dragging/dropping or form submitting.
2.  **Trigger**: Frontend invokes `socket.emit('reassign_task', ...)` or calls a REST endpoint like `POST /api/members`.
3.  **Database Change**: The backend validates the inputs and runs the `db.prepare(...).run()` to apply changes to SQLite.
4.  **Socket Broadcast**: *Immediately after the SQLite update*, the backend fires a socket emission.
    *   If it was a member change: `io.emit('dashboard-sync')`.
    *   If it was a task change for member X: `io.to('member:X').emit('tasks_update_member', ...)` and `io.to('admins').emit('tasks_update', ...)`.
5.  **Client Reaction**: The frontend (`realtime.js`) captures the event and invokes the rendering callbacks (e.g. `renderMemberTasks()` or `renderDashboardMembers()`).

---

## 4. Key Security Assumptions
*   Tasks are strictly segregated via backend SQL queries (`WHERE member_id = ?`) before being pushed over sockets. A member user cannot trick the system into showing another member's tasks because the REST API doesn't expose them and the socket payload maps identically to the backend's enforced JWT token ID.
*   If an admin disables a user, a `force-logout` socket event is dispatched to that exact user's room, instantly snapping them back to the login screen and locally wiping their token. SQLite `sessions.revoked` status validates this hard-lock.