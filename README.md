# RoadGuard — React + Express + Firestore

RoadGuard is a municipal road-damage workflow demo. It includes a React/Vite frontend, Express API, Firestore persistence, photo uploads, JWT login, Socket.IO updates, and optional regional node processes.

## Requirements
- Node.js 20.19+ or 22.12+ (Vite 8 requires a modern Node runtime)
- A Firebase project with Firestore enabled and a Firebase Admin service account

## Configure backend (required)
1. Copy `server/.env.example` to `server/.env`.
2. Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of your Firebase service-account JSON, **or** fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
3. Set a unique `ADMIN_PASSWORD` and a random `JWT_SECRET` (at least 32 characters). Do not commit `server/.env` or service-account credentials.
4. Ensure the service account can read/write Firestore. Apply `firestore.indexes.json` if Firestore reports a missing index.

The app uses Firestore, not a JSON-file database. It seeds sample data on first startup. Resetting the sample data with `npm --prefix server run seed:reset` is destructive and should only be used for development.

## Install and run
```bash
npm install
npm --prefix server install
npm run dev:full
```
Open http://localhost:5173. The Vite development server proxies `/api`, `/uploads`, and `/socket.io` to the API at port 4000. To run separately, use `npm run server` and `npm run dev` in two terminals.

## Development login
On a fresh Firestore database, the backend seeds the configured `ADMIN_USERNAME` and `ADMIN_PASSWORD`. For local development only, the username defaults to `admin` and password defaults to `roadguard123`; change these before use beyond localhost. In production, `ADMIN_PASSWORD` and a strong `JWT_SECRET` are required. The React app now has a login screen and uses a session-scoped bearer token.

## API overview
- `POST /api/auth/login` — exchange username/password for a JWT
- `GET /api/auth/me` — validate the current JWT
- `GET /api/health` — backend health
- `GET/POST /api/reports` — list and submit citizen reports (public report submission is intentional); admin advancement/deletion requires authentication
- `GET /api/fleet`, `PATCH /api/fleet/:id/status` — fleet listing and protected status changes
- `GET /api/workflow`, `POST /api/workflow/advance` — workflow listing and protected advancement
- `GET /api/notifications`, `POST /api/notifications/mark-all-read` — list and protected mark-read operation
- `GET/PUT /api/settings` — read settings and protected updates
- `GET /api/activity`, `GET /api/stats`, `GET /api/stats/analytics`, `GET /api/topology`
- `POST /api/reports/mobile-detection` — device ingestion endpoint; protect it with a device/API key before exposing it publicly

Protected mutations require `Authorization: Bearer <token>`. Public report submission is retained for citizen reporting; apply rate limiting, CAPTCHA or equivalent abuse controls before exposing it to the public internet.

## Geographic routing
The report form accepts optional state, city, and locality fields and passes them to the gateway. A registered locality/city/state node is used only when the submitted locality is recognized by `server/nodeRegistry.js`; otherwise the gateway uses central Firestore handling. `npm run dev:decentralized` starts the gateway, frontend, and the example regional node processes.

## Honest limitations
- This is a workflow prototype, not a production road-damage AI detection platform. Severity is rule-based and analytics include illustrative sensor metrics.
- The map is a stylized dashboard visualization, not a real GIS map or live GPS tracking. Real maps need a provider/tiles, geographic coordinates, and usage/compliance review.
- Firestore credentials and project setup cannot be included in this ZIP. Runtime success depends on valid Firebase configuration.
- Mobile-detection ingestion currently needs a device/API-key security layer before public deployment.
- Review `firestore.rules`, indexes, CORS origins, upload size/type limits, rate limiting, and deployment secrets before production use.

## Build and checks
```bash
npm run build
npm run lint
node --check server/index.js
```
A successful syntax check does not prove Firestore connectivity or end-to-end behaviour; run the app with your own Firebase project and verify login, CRUD, uploads, persistence, node routing, and multi-tab Socket.IO updates.


## Live geographical map and vehicle GPS

The Live Road Map now uses Leaflet with OpenStreetMap tiles. Road incidents appear only when their report contains valid `lat` and `lng` coordinates; old/demo reports without coordinates are intentionally not assigned fake positions. The map displays vehicle positions received by the backend and refreshes the location list every 10 seconds. Socket.IO also broadcasts `fleet:location` events for real-time consumers.

### Configure GPS ingestion

1. Set a long random `GPS_INGEST_KEY` in `server/.env`. Never place this key in frontend code or commit the real `.env` file.
2. A trusted vehicle device should send `POST /api/fleet/<vehicleId>/location` with header `X-GPS-Key: <your key>` and JSON such as `{ "lat": 22.5726, "lng": 88.3639, "speedKph": 22, "heading": 90, "status": "Moving" }`. The backend validates coordinates, stores the latest position in memory, and emits `fleet:location`.
3. To test without hardware, run `npm run gps:simulator` in a separate terminal after setting `GPS_INGEST_KEY`. Simulated markers are explicitly labelled SIMULATED GPS. They are not real vehicle locations.
4. Install frontend dependencies (`npm install`) so Leaflet is installed, then run the app as usual. Open the Live Road Map page. Internet access is required for OpenStreetMap tiles.

### Honest limitations

- Real vehicle tracking requires actual GPS hardware/mobile telemetry to POST updates; the simulator is for development only.
- The latest vehicle locations are held in backend memory and are lost on backend restart. Use a persistent location store/time-series database for production history and replay.
- OpenStreetMap tiles provide the base map, not traffic conditions, vehicle tracking, or incident detection. Tile use is subject to OpenStreetMap's tile usage policy.
- Reports without real coordinates remain off-map until GPS coordinates are captured or supplied.
