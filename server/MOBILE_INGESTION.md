# Mobile Detection Ingestion

Connects a real phone (or any GPS+accelerometer device) to RoadGuard without
building a native app.

## The endpoint

```
POST /api/reports/mobile-detection
Content-Type: application/json
```

```json
{
  "deviceId": "MOB-WEB-4F2A",
  "timestamp": "2026-09-12T10:14:22.105Z",
  "location": { "latitude": 22.5265, "longitude": 88.3654, "accuracy": 8.2, "heading": 182.4, "speed": 3.1 },
  "detection": { "class": "pothole", "confidence": 0.82, "boundingBox": null, "severityScore": "HIGH" },
  "telemetry": { "accelZPeak": 2.4, "imuImpactConfirmed": true }
}
```

Matches the schema in the architecture PDF. What happens server-side
(`server/reportsRepo.js`, `createOrMergeMobileDetection`):

1. **Locality resolution** — raw lat/lng is matched against
   `server/lib/knownLocalities.js` (nearest-anchor lookup, currently a small
   hardcoded table) to pick the `state/city/locality` shard. Swap this for a
   real reverse-geocoding API (Google Geocoding, Nominatim) whenever you're
   ready — nothing downstream cares how the tuple was derived.
2. **Spatial dedupe** — within that shard, any existing geo-tagged report
   inside `DEDUPE_RADIUS_METERS` (default 15m; the PDF's spec was 3m, which
   is tighter than typical phone GPS accuracy) is treated as the same
   pothole: its `confidenceCount` increments and severity/score can be
   promoted, instead of creating a duplicate ticket.
3. **Create** — otherwise, a new report is created exactly like a citizen
   report, plus `lat`, `lng`, `sourceDeviceId`, `confidenceCount`,
   `lastAccelZPeak`, `aiConfidence`.

Either path emits the same `report:created` / `report:updated` Socket.IO
events the dashboard already listens for — no frontend changes needed.

## The phone capture page

`server/public/mobile.html` — a single static file, served automatically by
the Express server. No build step, no app install.

Open `http://<server-host>:4000/mobile.html` on a phone:

1. Tap **Enable Motion & Location** (iOS will show a permission prompt).
2. Toggle **Auto-detect bumps** — it watches `devicemotion`, and any
   acceleration spike over the sensitivity threshold (default 2.2g) posts a
   detection.
3. Or tap **Report Bump Now** to send one manually (useful for testing
   before you've found a real pothole).

**Important — HTTPS requirement:** iOS and modern Android block
`DeviceMotionEvent` and precise `Geolocation` outside a "secure context"
(HTTPS, or `localhost`). Since your phone is a different device than the
one running the server, `localhost` doesn't apply. To test on a real phone:

```bash
npx localtunnel --port 4000
# or: ngrok http 4000
```

then open the HTTPS URL it gives you on your phone instead of the LAN IP.
The page will show a banner warning you if it detects it's not in a secure
context.

## Extending toward the full roadmap

- The current page infers "pothole" for every bump — it has no camera
  classification. If you want real CV, the natural next step is TensorFlow.js
  running a quantized model client-side in this same page (Phase 1/2 of the
  roadmap), which would populate `detection.class`, `confidence`, and
  `boundingBox` from an actual frame instead of guessing from accelerometer
  magnitude alone.
- `server/simulator/adashSimulator.js` still posts to the older
  `POST /reports` multipart endpoint — worth pointing it at
  `/reports/mobile-detection` with the fuller telemetry payload for
  consistency, if you want simulated and real traffic to behave identically.
