# Architecture & Vercel Deployment Rules

Critical project rules that **must never be broken or reverted** in future iterations:

## 1. ES Module Import Path Extensions (`.js` required in TypeScript imports)
- The project runs as native ES Modules (`"type": "module"` in `package.json`).
- When importing local TypeScript relative files, **always include the `.js` extension** (e.g., `import { db } from "./server_db.js";` in `server.ts` and `import { appPromise } from "../server.js";` in `api/index.ts`).
- Failure to include `.js` will cause `ERR_MODULE_NOT_FOUND` in Vercel Serverless Functions.

## 2. Vercel Serverless Function Middleware Rules
- In `server.ts`, Vite dev middleware **must only load when NOT in Vercel environment**:
  `if (!process.env.VERCEL && process.env.NODE_ENV !== "production")`
- Vercel handles static assets separately via `dist/`, so Vite middleware must never be initialized inside Vercel Lambda functions.

## 3. Database & Admin Credentials (`sorteosos` database & collections)
- Database: MongoDB Atlas (`sorteosos`).
- Main Collections:
  - `usuarios`: Contains authentication credentials.
  - `participantes_no_relacional`: Contains raffle participants data.
  - `eventos`: Contains live draw state and configuration.
  - `historial`: Contains activity audit logs.
  - `configuracion`: Contains global app configuration.
- Admin Accounts required in MongoDB:
  - `admin@sos.com.co` (Password: `FiebreMundial2026`)
  - `mundialsorteo@sos.com.co` (Password: `FiebreMundial2026`)
- `seedMongo()` in `server_db.ts` uses `findOneAndUpdate` with `upsert: true` and an `isSeeded` guard flag to ensure these admin users are verified upon database connection without re-running heavy seeding queries on every request.

## 4. API Entrypoint (`api/index.ts`)
- `api/index.ts` delegates all Vercel serverless requests to `appPromise` exported from `../server.js`.
- The Express app handles `/api/*` endpoints (e.g., `/api/event/state`, `/api/participants`, `/api/login`, `/api/db/status`).

## 5. Performance & Serverless Optimization
- Connection Caching: `global._mongoosePromise` reuses the Mongoose connection across Vercel Lambda cold/warm starts.
- Lean Queries: Read operations in `server_db.ts` use `.lean()` for lightweight JSON serialization and reduced memory overhead.
- Query Caps: Audit logs are retrieved with `.limit(200)` to keep memory footprint low and responses under fast serverless execution limits.
