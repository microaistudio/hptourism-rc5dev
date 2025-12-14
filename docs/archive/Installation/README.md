## Installation Notes

This folder holds everything needed to bootstrap a fresh VM and manage storage/backups for the HP Tourism stack.

### Files

| File | Purpose |
| --- | --- |
| `setup.sh` | One-click installer (Node, Postgres, nginx, app deploy). Run on clean Ubuntu using `sudo bash Installation/setup.sh`. |
| `nginx-site.conf` | Template used by the installer for `/etc/nginx/sites-available/hptourism-stg.conf`. |
| `backup.sh` | Creates a timestamped backup of Postgres + the object-storage directory. Run with sudo. |

### Local Object Storage

The installer provisions `/var/lib/hptourism/storage` and configures `.env` with:

```
OBJECT_STORAGE_MODE=local
LOCAL_OBJECT_DIR=/var/lib/hptourism/storage
LOCAL_MAX_UPLOAD_BYTES=$((20 * 1024 * 1024))
```

Uploaded documents land under `${LOCAL_OBJECT_DIR}/${type}s/<uuid>`. The new `storage_objects` table tracks metadata (size, checksum, MIME, owning application/doc) so we can audit file usage and migrate to other providers later.

### Switching to MinIO / S3-compatible storage

If the VM needs object storage that behaves like AWS S3:

1. Install MinIO (runs great on the same VM):
   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   sudo install minio /usr/local/bin/minio
   sudo useradd --system --home-dir /var/lib/minio --shell /sbin/nologin minio
   sudo mkdir -p /var/lib/minio/data
   sudo chown -R minio:minio /var/lib/minio
   ```
2. Create `/etc/default/minio` with your access keys:
   ```
   MINIO_ROOT_USER=hptourism
   MINIO_ROOT_PASSWORD=superStrongSecret
   MINIO_VOLUMES=/var/lib/minio/data
   MINIO_OPTS="--console-address :9001"
   ```
3. Install the service:
   ```bash
   sudo tee /etc/systemd/system/minio.service >/dev/null <<'EOF'
   [Unit]
   Description=MinIO Object Storage
   After=network.target

   [Service]
   User=minio
   Group=minio
   EnvironmentFile=/etc/default/minio
   ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   EOF

   sudo systemctl enable --now minio
   ```
4. Update `/opt/hptourism/app/.env` and restart the app:
   ```
   OBJECT_STORAGE_MODE=s3
   OBJECT_STORAGE_S3_BUCKET=hptourism-files
   OBJECT_STORAGE_S3_REGION=auto
   OBJECT_STORAGE_S3_ENDPOINT=http://127.0.0.1:9000
   OBJECT_STORAGE_S3_FORCE_PATH_STYLE=true
   OBJECT_STORAGE_S3_ACCESS_KEY_ID=hptourism
   OBJECT_STORAGE_S3_SECRET_ACCESS_KEY=superStrongSecret
   ```
   Then run `sudo systemctl restart hptourism-stg`.

All uploads will start using MinIO while the metadata continues to be recorded in `storage_objects`.

### Backups

The installer now provisions an automated backup pipeline:

- **Timer**: `hptourism-stg-backup.timer` (adjust name if you change `SERVICE_NAME` in `setup.sh`) runs nightly at 02:30 with a 5‑minute jitter.
- **Service**: `hptourism-stg-backup.service` executes `Database/scripts/backup.sh`, which dumps Postgres and archives the object store into `/var/backups/hptourism/<timestamp>/`.
- **Config**: `/opt/hptourism/app/Database/db-config.env` is rewritten during install so the script knows the current DB name/user/password.

Check status or trigger an ad-hoc run:

```bash
sudo systemctl status hptourism-stg-backup.timer
sudo systemctl start hptourism-stg-backup.service   # immediate backup
```

For manual/one-off backups you can still call the helper script directly:

```bash
sudo bash Installation/backup.sh /custom/backup/path
```

Regardless of method, copy the resulting archives off the VM periodically so you have off-site recovery points.

### Offline Dependencies

The tarball ships with a `deps/` directory that contains pre-downloaded `.deb` packages (nginx, PostgreSQL 16, libpq, rsync, logrotate, fail2ban, gettext-base), plus the Node.js runtime tarball and PM2 npm bundle. During installation the script first tries to install from `deps/`; if the folder is missing it falls back to the public Ubuntu/NodeSource repositories. Before packaging a release, populate the cache with:

```bash
cd /home/subhash.thakur.india/Projects/hptourism-stg-rc3
scripts/fetch-deps.sh   # runs apt-get download + npm pack pm2
```

This step only needs to run once on a machine with internet access; afterward, the generated tarball can be copied to air-gapped servers and `Installation/setup.sh` will install everything without hitting the network.

### Database Deployment Options

You have three supported ways to point the portal at a Postgres instance:

1. **Bundled local Postgres (default)** – do nothing extra. `Installation/setup.sh` provisions PostgreSQL 16 locally (`INSTALL_LOCAL_DB=true`), creates the `hptourism_stg` database, and writes `.env` + `Database/db-config.env` pointing at `localhost`. Backups use the local socket.
2. **External Postgres during install** – override the connection parameters when running the installer and skip local provisioning:
   ```bash
   sudo INSTALL_LOCAL_DB=false \
        DB_HOST=db.example.com \
        DB_NAME=homestay_prod \
        DB_USER=postgres \
        DB_PASSWORD='superSecret!' \
        bash Installation/setup.sh
   ```
   The script skips `CREATE DATABASE`, writes `.env`/`Database/db-config.env` with the values you provided, and the nightly backup timer will `pg_dump` that remote instance.
3. **Post-install switch (Super Admin)** – use **Super Console → Database Connectivity** to test/enter host/port/db/user/password. Toggle “Update runtime configuration” to rewrite `.env` and `Database/db-config.env`, then restart PM2/systemd so the app loads the new `DATABASE_URL`.

In every mode the backup service reads `Database/db-config.env`, so as long as the credentials are valid the nightly archive job will keep working even if the database lives on a different VM or cloud service.
