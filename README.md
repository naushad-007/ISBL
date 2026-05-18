# ISBL Portal (Realtime Academic Lab Management)

Production-ready ISBL Portal with preserved visual identity, modular vanilla frontend, secure Node backend, SQLite persistence, and Socket.IO realtime sync.

## Stack

- **Frontend:** HTML + TailwindCSS + modular Vanilla JS + Socket.IO client
- **Backend:** Node.js + Express + Socket.IO
- **Database:** SQLite (`better-sqlite3`)
- **Auth:** JWT + bcrypt

## Project Structure

```text
isbl-portal/
├── client/
│   ├── index.html
│   ├── admin.html
│   ├── dashboard.html
│   ├── css/
│   │   ├── style.css
│   │   └── tailwind.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── members.js
│   │   ├── realtime.js
│   │   ├── api.js
│   │   └── ui.js
│   └── assets/
├── server/
│   ├── server.js
│   ├── socket.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── memberRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── adminMiddleware.js
│   ├── database/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   └── isbl.sqlite
│   └── utils/
│       ├── jwt.js
│       └── hash.js
├── .env
├── package.json
├── tailwind.config.js
└── README.md
```

## API

- `POST /api/auth/admin-login`
- `POST /api/auth/team-login`
- `POST /api/auth/logout`
- `GET /api/members`
- `POST /api/members` (admin)
- `PUT /api/members/:id` (admin)
- `DELETE /api/members/:id` (admin)
- `GET /api/admin/overview` (admin)

## Realtime Events

- `member-added`
- `member-removed`
- `member-updated`
- `force-logout`
- `dashboard-sync`

## Local Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env` values (especially `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_ORIGIN`).
3. Start backend:
   ```bash
   npm run dev
   ```
4. Serve `client/` as static files (VS Code Live Server or Netlify dev).

## Deployment

### Prerequisites
- GitHub repository with this project pushed (including `.gitignore`)
- Railway account (https://railway.app)
- Backend deployed on Railway (or similar Node.js host)
- Frontend deployed on Netlify, Vercel, or static CDN

### Step 1: Prepare Repository for Deployment

1. **Ensure `.gitignore` exists** and contains:
   ```
   .env
   node_modules/
   server/database/isbl.sqlite
   server/database/isbl.sqlite-shm
   server/database/isbl.sqlite-wal
   ```

2. **Create `.env.example`** for reference (never commit actual `.env`):
   ```
   PORT=4000
   JWT_SECRET=your-super-secret-key
   JWT_EXPIRES_IN=12h
   BCRYPT_SALT_ROUNDS=12
   FRONTEND_ORIGIN=https://your-frontend-domain.com
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=strongpassword123
   ```

3. **Verify project structure** at repository root:
   ```
   isbl-portal/
   ├── client/
   ├── server/
   ├── package.json
   ├── .env (DO NOT push)
   ├── .gitignore
   ├── .env.example
   ├── README.md
   └── ISBL_PORTAL_ARCHITECTURE.md
   ```

### Step 2: Deploy Backend on Railway

1. **Connect GitHub repository:**
   - Go to https://railway.app/dashboard
   - Click "New Project" → "Deploy from GitHub"
   - Select this repository

2. **Configure Environment Variables:**
   - In Railway Dashboard → Variables
   - Add all variables from `.env.example`:
     - `PORT` (can be omitted; Railway uses 3000 by default, but set to 4000)
     - `JWT_SECRET` (generate a strong random string)
     - `JWT_EXPIRES_IN=12h`
     - `BCRYPT_SALT_ROUNDS=12`
     - `FRONTEND_ORIGIN` (your frontend URL, e.g., https://yourfrontend.netlify.app)
     - `ADMIN_EMAIL` and `ADMIN_PASSWORD` (change from defaults!)

3. **Set Build & Start Commands:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Railway should auto-detect from `package.json` scripts

4. **Get Backend URL:**
   - After deployment, Railway provides a public URL (e.g., `https://isbl-portal-production.up.railway.app`)
   - Use this as your `FRONTEND_ORIGIN` target for the frontend

### Step 3: Deploy Frontend (Netlify Example)

1. **Build frontend static files:**
   ```bash
   npm run build:tailwind  # if you have this script
   ```

2. **Deploy to Netlify:**
   - Connect repository → select `client/` as publish directory
   - Set environment variable:
     ```
     VITE_API_BASE=https://isbl-portal-production.up.railway.app
     ```
   - Or manually inject into `client/js/api.js` base URL

3. **Update `FRONTEND_ORIGIN` on Railway:**
   - Once Netlify URL is live, update Railway env var to match
   - Redeploy so Socket.IO CORS allows your frontend domain

### Step 4: Database Initialization

- Railway will execute `schema.sql` on first boot if:
  - SQLite file does not exist (`.gitignore` ensures this)
  - Server initializes `db.js` which calls the schema on first connection
- Members and tasks tables are auto-created with the first request

### Important Notes

- **Do NOT commit `.env`, `node_modules/`, or SQLite files** — `.gitignore` prevents this
- **Protect your JWT_SECRET** — use a strong, random value in production
- **FRONTEND_ORIGIN must match** your frontend URL for Socket.IO CORS to work
- **SQLite durability** — Railway supports persistent volumes. Ensure your deployment keeps `/server/database/` persistent
- If you lose the database, Railway will recreate it from `schema.sql` on next boot
