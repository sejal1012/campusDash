# Campus Dex

Phase 1 campus exploration map for the University at Buffalo North Campus. Built with React, TypeScript, Vite, Mapbox GL JS, and the browser Geolocation API.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add a Mapbox public access token to `VITE_MAPBOX_ACCESS_TOKEN`.
3. Start the app with `npm run dev`.

Mapbox public tokens begin with `pk.`. The browser app needs a public token; restrict it to your local and deployed site URLs from your Mapbox account. Never put a secret `sk.` token in a `VITE_` variable.

Use `npm run typecheck`, `npm run lint`, and `npm run build` to check the project.

## Location behavior

Select **Start tracking** to request browser location permission. The app uses `watchPosition` with high accuracy and retains the last reading at or under the configured accuracy threshold (25 m by default). Poor readings mark the location as weak and do not move the avatar. Map panning and zooming are independent of GPS; use **Locate Me** to recenter explicitly.

Location requires a secure context: HTTPS in production or localhost during development. On iPhone, open the site in Safari, allow location access when prompted, and check **Settings → Privacy & Security → Location Services → Safari Websites** if access was denied. For best GPS accuracy, test outdoors with Location Services enabled. The browser may provide less accurate readings indoors.

## Development GPS simulation

To simulate movement locally, set `VITE_GPS_SIMULATION=true` and optionally set `VITE_SIM_LATITUDE` and `VITE_SIM_LONGITUDE` in `.env.local`, then restart Vite. The toggle only takes effect in development builds. The simulated position drifts around its configured starting coordinates and does not request device location.

## Map styling

The map uses Mapbox's Streets v12 vector style, recolors available building, park, background, and pedestrian layers, and preserves the underlying geographic geometry. `src/mapConfig.ts` contains the initial North Campus extent and the illustrative place markers. A custom Mapbox Studio style can replace the base style without changing the geolocation components.

The concept PDF referenced in the original brief was not present in the supplied project or attachment set, so the interface uses the described illustrated palette and game-like UI direction.
