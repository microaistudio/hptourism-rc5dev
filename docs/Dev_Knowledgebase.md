# Dev Knowledgebase

## KB-001 – Blank Dashboard After Frontend Changes

- **Environment**: `hptourism-stg-rc3` (port 4000, root PM2 service).
- **Symptoms**: Owner/DA dashboard shows a blank white page; browser console logs `ReferenceError: draftData is not defined` from `index-CqcODBFu.js`. Issue reappears whenever we edit owner application or DA dashboard screens.
- **Root Cause**: The production bundle being served by nginx/PM2 was never refreshed after code edits. Because Vite emits hashed filenames (`index-XXXX.js`), nginx kept serving an older JS bundle that still referenced `draftData`. The HTML was cached by browsers, so even after rebuilding locally, users continued to download an incompatible bundle → runtime crash.
- **Fix Steps (10 min)**:
  1. From repo root run `npm run build`.
  2. Copy/sync `dist/public` to the live deploy directory (already wired when running from repo).
  3. Ensure the generated assets are deterministic (`assets/index.js`, `assets/index.css`). We added Rollup output overrides so filenames no longer change per build.
  4. Restart the root PM2 service: `sudo env PM2_HOME=/root/.pm2 pm2 restart hptourism-stg-rc3 --update-env`.
  5. Hard-refresh once to confirm `/assets/index.js` loads (DevTools Network tab should show status 200, not 304 from cache).
- **Prevention**: Always rebuild + restart after touching React code. If you ever see `draftData` (or any removed symbol) in the production console, rebuild immediately and check that `/assets/index.js` timestamp updated. Keeping deterministic asset names avoids stale bundles and saves 5–6 hours of debugging.
