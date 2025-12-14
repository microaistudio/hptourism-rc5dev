## 2025-11-06

- Replaced the DA application detail lookup with a shared helper that queries Postgres and returns application + owner in one call. Eliminates the dangling `currentUser` reference that was crashing `/api/da/applications/:id`.
- Rebuilt and restarted PM2 after the change; verified the endpoint locally with `curl` (see command below) to confirm a 200 response:
  ```
  curl -s -i -b /tmp/da_cookie.txt http://127.0.0.1:5000/api/da/applications/<applicationId>
  ```

