# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start everything (recommended):**
```
START-ERP.bat
```

**Start individually:**
```bash
# Backend (port 5000)
cd backend && node server.js
# or with auto-reload:
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

**Install dependencies after cloning:**
```bash
npm run install:all
```

There is no test runner configured. Use `node test-features.js` at the root for manual smoke tests.

## Architecture Overview

This is a full-stack college ERP (MS Ramaiah Institute of Management). The frontend proxies all `/api/*` requests to the backend, so no CORS handling is needed during development.

```
MSRIM ERP/
├── backend/
│   ├── server.js          # Express app entry — mounts all routes
│   ├── database/
│   │   ├── db.js          # node:sqlite setup, schema creation, seed data
│   │   └── extend_db.js   # Schema migrations (run on every startup)
│   ├── middleware/
│   │   └── auth.js        # JWT authenticate() + authorize(...roles) middleware
│   └── routes/            # One file per module (30+ routes)
└── frontend/
    ├── src/
    │   ├── App.jsx         # React Router v6 routes + ProtectedRoute wrapper
    │   ├── contexts/
    │   │   └── AuthContext.jsx  # Auth state, login/logout, token in localStorage
    │   ├── utils/
    │   │   └── api.js      # Axios instance — auto-injects Bearer token, redirects on 401
    │   ├── pages/          # One directory per module, mirrors backend routes
    │   └── components/
    │       └── Layout/     # App shell (sidebar, topbar)
    └── vite.config.js      # Proxies /api → http://localhost:5000
```

## Database

- Uses **Node 24 built-in `node:sqlite`** (`const { DatabaseSync } = require('node:sqlite')`). Do **not** add `better-sqlite3`, `sqlite3`, or `sql.js` — native compilation fails on this machine.
- Database file: `backend/database/msrim_erp.db` (auto-created on first run).
- Schema + seed data are applied in `db.js` → `initializeDatabase()` / `seedData()`. Seeds only run if the `admin` user doesn't exist yet. To re-seed: delete `msrim_erp.db` and restart.
- Migrations live in `extend_db.js` → `extendDatabase()`, called on every startup.
- **SQL quoting rule:** string literals must use single quotes. Double quotes = column name in SQLite.
  ```js
  // Wrong:  WHERE status = "active"
  // Correct: WHERE status = 'active'
  db.prepare("SELECT * FROM users WHERE status = 'active'").all()
  ```
- `db.prepare()` is wrapped to return `{ changes, lastInsertRowid }` as integers (mirrors better-sqlite3 API).
- `db.transaction(fn)` is a manual wrapper — it returns a function you call, not a direct executor.

## Authentication & Authorization

JWT tokens (8h expiry). Secret: env var `JWT_SECRET` or hardcoded fallback `msrim-digital-campus-secret-2024`.

Roles: `admin`, `faculty`, `student`, `hod`, `registrar`, `librarian`, `accounts`, `placement`, `parent`.

Apply to routes:
```js
const { authenticate, authorize } = require('../middleware/auth');
router.get('/admin-only', authenticate, authorize('admin'), handler);
router.get('/multi-role', authenticate, authorize('admin', 'hod'), handler);
```

Frontend: `useAuth()` hook from `AuthContext`. `ProtectedRoute` in `App.jsx` accepts an optional `roles` array — omit it to allow all authenticated users.

## Adding a New Module

1. **Backend:** create `backend/routes/mymodule.js`, export an Express router, mount it in `server.js` as `app.use('/api/mymodule', require('./routes/mymodule'))`.
2. **Database:** add `CREATE TABLE IF NOT EXISTS` in `db.js → initializeDatabase()`, or a migration in `extend_db.js → extendDatabase()`.
3. **Frontend:** create `frontend/src/pages/MyModule/MyModule.jsx`, add the route in `App.jsx`, and add the nav link in `components/Layout/`.
4. All API calls go through `utils/api.js` — token injection is automatic.
