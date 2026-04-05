# Last Update Log

## 2026-04-02 02:18:39 +06:00

Summary:

- Added a dedicated architecture note explaining the current modular-monolith structure and how the earlier service split was consolidated with minimum backend and database change.

Changes made:

- Added [`MODULAR_MONOLITH_STRUCTURE.md`](./MODULAR_MONOLITH_STRUCTURE.md) covering:
  - the current runtime topology
  - why the codebase still has a microservice-style feel
  - how the old service domains were folded into one Spring Boot app
  - how routing works now without an API gateway
  - how databases, internal module calls, and deployments are handled now
- Updated `README.md` to link to the new monolith structure guide.

Verification:

- Guide content checked against the current repo structure and runtime files:
  - `backend/monolith`
  - `docker-compose.yml`
  - `render.yaml`
  - `backend/monolith/src/main/resources/application.yml`
  - current frontend `/api/...` usage

Notes:

- Some older files under `docs/` still describe the previous microservice-era design and should be treated as historical unless updated separately.

## 2026-04-02 02:07:33 +06:00

Summary:

- Replaced the old Airbnb-style brand mark with a custom geometric `A` logo in the frontend navbar and browser tab icon.

Changes made:

- Updated `frontend/src/components/Navbar.jsx` to use a new custom two-stroke `A` mark based on the selected:
  - outer roof shape
  - inner nested roof shape
- Updated `frontend/src/components/Navbar.css` to size and color the new logo mark consistently with the wordmark.
- Updated `frontend/public/index.html` so the browser tab favicon and theme color match the new logo.

Verification:

- Branding change applied at the main shared navbar entry point.

Notes:

- The visible wordmark text remains `airbnb`; this change only replaces the symbol/mark and tab icon.

## 2026-04-02 00:09:14 +06:00

Summary:

- Added a beginner-friendly step-by-step Vercel deployment guide for the frontend.

Changes made:

- Added [`VERCEL_FRONTEND_DEPLOY_GUIDE.md`](./VERCEL_FRONTEND_DEPLOY_GUIDE.md) covering:
  - importing the GitHub repo into Vercel
  - setting `frontend` as the root directory
  - setting the build/output/install commands
  - adding `REACT_APP_API_BASE_URL`
  - connecting the deployed frontend back to the Render backend
  - common failure cases and redeploy steps
- Updated `README.md` to link to the new Vercel deployment guide.

Verification:

- Guide content aligned with the current repo structure:
  - frontend root: `frontend`
  - build command: `npm run build`
  - output directory: `build`
  - SPA rewrites already configured in `frontend/vercel.json`

Notes:

- The Vercel guide assumes the backend is already deployed on Render and you have the final backend URL ready for `REACT_APP_API_BASE_URL`.

## 2026-04-01 23:23:11 +06:00

Summary:

- Finalized the repo for Render backend deployment and added a beginner-friendly deployment guide.
- Improved homepage perceived image loading by restoring cache usage and reducing image-processing overhead.

Changes made:

- Updated `render.yaml`:
  - added `region: singapore`
  - added a backend-only `buildFilter`
  - added `JWT_EXPIRY` and `JWT_REFRESH_EXPIRY` to the declared env vars
- Updated `backend/monolith/src/main/resources/application.yml` to reduce default backend log verbosity from `DEBUG` to `INFO` for production-friendly Render logs.
- Added [`RENDER_BACKEND_DEPLOY_GUIDE.md`](./RENDER_BACKEND_DEPLOY_GUIDE.md) with step-by-step Render deployment instructions for a beginner.
- Updated `README.md` to link to the new Render deployment guide.
- Updated `frontend/src/pages/HomePage.jsx` to stop clearing homepage cache on every load, show cached host cards immediately when available, and use async image decoding.
- Updated `frontend/src/utils/imageUtils.js` to remove render-time image debug logging.

Verification:

- `backend/monolith`: `mvn -B -DskipTests package` -> passed
- `frontend`: `npm run build` -> passed

Notes:

- For Render, the remaining non-code requirement is that your MongoDB Atlas network access must allow connections from Render.
- Git will store the code and docs changes, but the MongoDB data changes already made earlier remain in the database itself, not in Git.

## 2026-04-01 23:12:31 +06:00

Summary:

- Improved homepage perceived image loading speed by restoring cache usage and removing render-time image debug overhead.

Changes made:

- Updated `frontend/src/pages/HomePage.jsx` so it:
  - uses cached host suggestion data immediately if available
  - stops clearing the homepage cache on every load
  - prefers property portfolio images before host profile images for listing cards
  - uses `decoding="async"` on homepage card images
- Updated `frontend/src/utils/imageUtils.js` to remove noisy console logging during image URL normalization.
- Bumped the homepage suggestion cache key to `host_suggestions_cache_v2`.

Verification:

- `frontend`: `npm run build` -> passed

Notes:

- This improves perceived speed the most on repeat visits and when navigating back to the homepage.
- The actual remote image host still affects first-load image speed, but the page no longer forces a cold reload of the homepage card data every time.

## 2026-04-01 23:07:37 +06:00

Summary:

- Replaced the plain `+` markers in the listing amenity list with actual amenity icons.
- Fixed the host location data so listing maps now use real city-center coordinates instead of random points.

Changes made:

- Updated `frontend/src/pages/ListingDetailsPage.jsx` to render amenity-specific icons using `react-icons` instead of a plain `+` prefix.
- Updated `frontend/src/pages/ListingDetailsPage.css` so amenity icons align cleanly with the text grid.
- Geocoded active approved host locations from their `city` and `country` fields and bulk-updated MongoDB `userdb.hosts` with corrected:
  - `latitude`
  - `longitude`
  - `locationLabel`
- Used Open-Meteo geocoding for the main bulk pass and then manually filled the remaining unresolved locations:
  - `Washington DC, USA`
  - `Quy Nhon, Vietnam`
  - `Baa Atoll, Maldives`
  - `Vaavu Atoll, Maldives`
  - `Halong Bay, Vietnam`
  - `Ayutthaya, Thailand`
  - `Hai Phong, Vietnam`

Verification:

- `frontend`: `npm run build` -> passed
- Example host `33e78c1c-78a8-4e4b-94d8-43f377becc34` now returns:
  - `city`: `Krabi`
  - `country`: `Thailand`
  - `latitude`: `8.07257`
  - `longitude`: `98.91052`
- Bulk location repair results:
  - unique city/country pairs processed: `288`
  - auto-resolved: `281`
  - manually resolved afterward: `7`
  - active hosts updated with corrected coordinates: `1150`

Notes:

- Maps now point to city centers derived from the host profile location fields, not exact street-level property coordinates.
- Existing host identities, amenities, and payment settings were left intact during the coordinate repair.

## 2026-04-01 22:51:14 +06:00

Summary:

- Replaced the old two-button amenity filter UI with checkbox filters for the top 5 offerings.
- Rebalanced MongoDB host data so the major offerings and `payLaterAllowed` are now roughly 50/50 to 60/40 instead of being mostly enabled.

Changes made:

- Added shared `TOP_OFFERING_FILTERS` in `frontend/src/utils/hostUtils.js` for:
  - `WiFi`
  - `Air conditioning`
  - `Kitchen`
  - `Parking`
  - `Pool`
- Updated `frontend/src/pages/SearchPage.jsx` to filter using those 5 offerings via checkboxes and to render listing feature chips from normalized amenities.
- Updated `frontend/src/pages/HomePage.jsx` to use the same checkbox-based top-offering filters.
- Rebalanced all active approved host documents in MongoDB `userdb.hosts` so top-level `payLaterAllowed` and the matching hosted-property flags/amenity arrays follow deterministic target splits.
- Kept the existing coordinates and listing identities intact; only offering/payment availability fields were rebalanced.

Verification:

- `frontend`: `npm run build` -> passed
- Final active-host distribution after the DB rebalance:
  - total hosts: `1150`
  - pay later available: `575`
  - WiFi: `690`
  - Air Conditioning: `633`
  - Kitchen: `575`
  - Parking: `518`
  - Pool: `460`

Notes:

- The current split is:
  - WiFi: `60%`
  - Air Conditioning: `55%`
  - Kitchen: `50%`
  - Parking: `45%`
  - Pool: `40%`
  - Pay later: `50%`
- Search-page cache version remains bumped so stale pre-rebalance payloads are not reused in the browser.

## 2026-04-01 22:28:43 +06:00

Summary:

- Simplified the listing payment badge so it shows only one state.
- Corrected amenity normalization so explicit boolean flags override noisy amenity arrays.
- Reduced WiFi availability for a subset of hosts so host features are no longer effectively universal.

Changes made:

- Updated `frontend/src/pages/ListingDetailsPage.jsx` to show a single payment badge:
  - `Pay later available`
  - or `Have to pay now`
- Updated `frontend/src/utils/hostUtils.js` so `hasKitchen: false`, `hasWiFi: false`, and similar explicit flags remove those amenities from the derived amenity list instead of leaving the raw array value in place.
- Bumped `frontend/src/pages/SearchPage.jsx` cache version from `v2` to `v3` so stale cached search payloads are not reused after the amenity logic/data change.
- Updated 80 MongoDB `userdb.hosts` records that previously had no explicit `hasWiFi` flag:
  - set `hostedProperties[].hasWiFi = false`
  - removed `"WiFi"` from those properties' `amenities` arrays

Verification:

- `frontend`: `npm run build` -> passed
- Effective amenity mix after normalization:
  - total hosts: `1150`
  - WiFi hosts: `1070`
  - Kitchen hosts: `942`
  - Hosts with both WiFi and Kitchen: `862`

Notes:

- WiFi is still common across the dataset, but it is no longer universal.
- Kitchen is now varied because the frontend respects explicit `hasKitchen` boolean flags already present in the data.

## 2026-04-01 22:16:20 +06:00

Summary:

- Fixed the search/home tax copy to say "after taxes".
- Fixed amenity filtering so WiFi and Kitchen now read from hosted property amenities and flags.
- Fixed listing details to use hosted property data for amenities, guest counts, and payment messaging.
- Corrected the visible Edinburgh host coordinates in MongoDB and introduced a pay-now-only mix for those search results.

Changes made:

- Updated `frontend/src/utils/hostUtils.js` to derive amenities, location parts, coordinates, and pay-later availability from both top-level host fields and `hostedProperties`.
- Updated `frontend/src/pages/HomePage.jsx` and `frontend/src/pages/SearchPage.jsx` tax toggle copy to "Display total after taxes".
- Bumped the search-page cache key version so previously cached stale location/payment data is not reused in the browser.
- Updated `frontend/src/pages/ListingDetailsPage.jsx` so the details page shows real amenities from hosted properties, always shows pay-now availability, conditionally shows pay-later availability, and renders the location section from normalized location data.
- Updated `frontend/src/pages/ReservationPage.jsx` to use the same shared pay-later and guest-capacity fallbacks as the listing details page.
- Updated `frontend/src/components/SearchResultsMap.jsx` to use normalized coordinate parsing.
- Updated MongoDB `userdb.hosts` records for:
  - `46415268-ccd8-4fc5-b4a4-79422048f791`
  - `07c3fa44-81d2-49f3-bc4a-8b357dcc549f`
  - `7ae68816-ecf0-46f8-84b8-ecbf52a108b0`
- Set those Edinburgh hosts to valid Edinburgh coordinates and synced top-level and hosted-property `payLaterAllowed` values so the visible results are no longer all pay-later.

Verification:

- `frontend`: `npm run build` -> passed
- `frontend`: `CI=true npm test -- --watch=false` -> passed
- `backend API`: `GET /api/users/46415268-ccd8-4fc5-b4a4-79422048f791` -> returned corrected Edinburgh coordinates
- `backend API`: `GET /api/users/hosts/suggestions?location=Edinburgh&page=0&limit=10` -> returned 3 Edinburgh hosts with corrected coordinates and mixed `payLaterAllowed` values

Notes:

- No Supabase credentials or data were changed.
- No MongoDB collections were renamed or migrated.
- The existing React test suite still emits the same `act(...)` warnings from `AuthContext.test.jsx`, but the tests pass.

## 2026-04-01 17:11:12 +06:00

Summary:

- Completed the repo alignment for the modular-monolith backend.
- Kept the frontend API surface unchanged.
- Kept the existing MongoDB Atlas and Supabase integration model intact.

Changes made:

- Replaced the old microservice `docker-compose.yml` with a single `monolith` service.
- Added `render.yaml` for deploying the backend monolith to Render.
- Fixed the admin verification fallback path so pending users without notification rows are still surfaced correctly.
- Updated the frontend WebSocket client to respect `REACT_APP_API_BASE_URL` instead of hardcoding `http://localhost:8080`.
- Switched notification requests to the shared Axios client so auth headers and base URL stay consistent.
- Updated the frontend auth service test to match the current stored auth payload shape.
- Rebuilt the GitHub Actions workflow around the monolith and Vercel-style frontend flow.
- Replaced stale microservice-era docs in `README.md`, `QUICK_START_GUIDE.md`, `how_to_run.txt`, and `.env.example`.

Verification:

- `backend/monolith`: `mvn test -B --no-transfer-progress` -> passed
- `backend/monolith`: no backend test sources currently exist
- `backend/monolith`: `java -jar target/monolith-1.0.0.jar` with root `.env` values and `PORT=32777` -> startup smoke passed
- `frontend`: `npm test -- --watch=false` -> passed after test update
- `frontend`: `npm run build` -> passed

Notes:

- No MongoDB collections were migrated or renamed.
- No Supabase credentials were changed.
- Existing frontend `/api/...` routes were preserved.
- Initial smoke attempts on `8080` and `8091` failed because those ports were already occupied on this machine, not because of an application boot error.
