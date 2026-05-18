# GitHub & Railway Deployment Checklist

## Pre-Deployment Verification

### Repository Structure ✓
- [x] `client/` directory with HTML, CSS, JS
- [x] `server/` directory with Express backend
- [x] `package.json` with proper scripts (`dev`, `start`)
- [x] `README.md` with deployment instructions
- [x] `.gitignore` configured (prevents `.env`, `node_modules/`, `*.sqlite*`)
- [x] `.env.example` as reference template
- [x] ISBL_PORTAL_ARCHITECTURE.md for documentation

### Files to NOT Commit ✓
- [x] `.env` (contains secrets)
- [x] `node_modules/` (should be auto-installed)
- [x] `server/database/isbl.sqlite` (auto-generated on first boot)
- [x] `server/database/isbl.sqlite-shm` (SQLite WAL file)
- [x] `server/database/isbl.sqlite-wal` (SQLite WAL file)

### Backend Configuration ✓
- [x] `server.js` serves static client files
- [x] CORS configured for `FRONTEND_ORIGIN`
- [x] Socket.IO initialized and listening
- [x] SQLite schema auto-initializes from `schema.sql`
- [x] JWT authentication implemented
- [x] All environment variables documented in `.env.example`

### Frontend Configuration ✓
- [x] `client/js/api.js` uses dynamic base URL
- [x] Socket.IO client connected to backend
- [x] Authentication flow integrates with backend JWT
- [x] Real-time task sync for members implemented
- [x] Admin task manager functional

---

## GitHub Push Steps

1. **Initialize/Update `.gitignore`:**
   ```bash
   # Already created at: isbl-portal/.gitignore
   cat isbl-portal/.gitignore
   ```

2. **Verify `.env` is ignored:**
   ```bash
   git status  # Should NOT show .env or *.sqlite files
   ```

3. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment: add .gitignore, .env.example, deployment docs"
   git push origin main
   ```

---

## Railway Deployment Steps

### 1. Create New Railway Project
- Go to https://railway.app/dashboard
- Click "New Project" → "Deploy from GitHub"
- Select the `isbl-portal` repository
- Railway auto-detects `package.json` and uses `npm start`

### 2. Configure Environment Variables in Railway
Go to Railway Project Settings → Variables and set:

```
PORT=4000
JWT_SECRET=<generate-strong-random-string-here>
JWT_EXPIRES_IN=12h
BCRYPT_SALT_ROUNDS=12
FRONTEND_ORIGIN=https://your-frontend-url.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password-here>
```

### 3. Deploy Backend
- Railway auto-deploys from GitHub push
- Monitor logs in Railway Dashboard
- Verify `/api/health` responds with `{"status":"ok"}`

### 4. Get Railway Backend URL
- From Railway Dashboard, copy the public URL
- Example: `https://isbl-portal-production.up.railway.app`

### 5. Update FRONTEND_ORIGIN
- Update the `FRONTEND_ORIGIN` variable in Railway to match your frontend domain
- Redeploy backend

---

## Frontend Deployment (Netlify Example)

### 1. Deploy Static Files
```bash
# Option A: Netlify UI
# - Connect GitHub repo
# - Set publish directory: client/
# - Deploy

# Option B: CLI
netlify deploy --prod --dir=client/
```

### 2. Inject Backend API URL
In `client/js/api.js`, ensure it uses:
```javascript
const getApiBase = () => {
  return localStorage.getItem("ISBL_API_BASE") || 
         window.ISBL_API_BASE || 
         `${window.location.origin}/api`;
};
```

### 3. Set Environment Variable (if using Netlify)
```
VITE_API_BASE=https://isbl-portal-production.up.railway.app
```

---

## Post-Deployment Verification

1. **Health Check:**
   ```
   GET https://your-railway-url.com/api/health
   Response: {"status":"ok","service":"ISBL backend"}
   ```

2. **Admin Login:**
   - Navigate to frontend URL → Admin Login
   - Use credentials from `.env` (ADMIN_EMAIL, ADMIN_PASSWORD)
   - Verify JWT token in localStorage

3. **Real-time Socket Connection:**
   - Check browser DevTools → Network
   - WebSocket connection to `/socket.io/?...` should be `101 Switching Protocols`

4. **Member Task Sync:**
   - Login as admin and assign a task to a member
   - Login as member (separate browser/incognito)
   - Verify task appears in Tasks tab in real-time

---

## Production Checklist

Before going live:

- [ ] Change `JWT_SECRET` to a random 64+ character string
- [ ] Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` from defaults
- [ ] Set `FRONTEND_ORIGIN` to your actual frontend domain
- [ ] Enable HTTPOnly cookies in auth (optional but recommended)
- [ ] Test full login → assign task → member sees task flow
- [ ] Monitor Railway logs for errors
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Enable HTTPS everywhere (already enforced by Railway & modern CDNs)

---

## If Deployment Fails

1. **Check Railway Logs:**
   ```
   Railway Dashboard → Deployments → View Logs
   ```

2. **Verify Environment Variables:**
   - All keys from `.env.example` are set
   - No typos in variable names

3. **Verify GitHub Structure:**
   - `server/` exists at root
   - `package.json` has `"start": "node server/server.js"`

4. **Check SQLite Initialization:**
   - First boot may take 10-15s to create schema
   - Check logs for `schema.sql` execution

5. **CORS Issues:**
   - Ensure `FRONTEND_ORIGIN` matches your frontend domain exactly
   - Socket.IO CORS auto-configured from this variable

---

## Quick Reference

| Component | Location | Deploy To |
|-----------|----------|-----------|
| Backend | `server/` | Railway |
| Frontend | `client/` | Netlify/Vercel/CDN |
| Database | `server/database/schema.sql` | Auto-init on Railway |
| Config | `.env` (not committed) | Railway env vars |

