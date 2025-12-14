# HomeStay Backup Policy

This document describes how database and file backups are handled for the HomeStay deployment, and how to run them manually.

## What is backed up
- **PostgreSQL database**: full logical dump (`pg_dump`) of the application database.
- **Object storage**: tarball of the uploads/local object storage directory (default: `/var/lib/hptourism/storage`).

## Default automated backup
- The installer configures a systemd timer/service pair (`homestay-r1-backup.timer`/`homestay-r1-backup.service`) to run once per day.
- Backups are written to `/var/backups/hptourism/<timestamp>/` on the server.
- The daily run uses the packaged backup script to:
  - Dump the DB to `db.sql.gz`.
  - Archive storage to `storage.tar.gz` (if the storage directory exists).
  - (Some environments also prune older files; check your service or script configuration if retention is required.)

### Verify the timer
```bash
sudo systemctl status homestay-r1-backup.timer
sudo systemctl list-timers | grep homestay-r1-backup
sudo systemctl cat homestay-r1-backup.timer   # view OnCalendar schedule
```

### Manually trigger the scheduled backup
```bash
sudo systemctl start homestay-r1-backup.service
```

## Manual backup (one-off)
Use the bundled helper that reads `.env` for `DATABASE_URL` and storage location:
```bash
sudo bash scripts/manual-backup.sh                   # default root: /var/backups/hptourism/manual
sudo BACKUP_ROOT=/var/backups/hptourism/custom \
     LOCAL_STORAGE_DIR=/var/lib/hptourism/storage \
     bash scripts/manual-backup.sh
```
Outputs:
- `<BACKUP_ROOT>/<timestamp>/db.sql.gz`
- `<BACKUP_ROOT>/<timestamp>/storage.tar.gz` (if storage dir exists)

## Restore procedures
**Database restore (destructive to current DB):**
```bash
gunzip -c /var/backups/hptourism/<timestamp>/db.sql.gz | \
  psql "$DATABASE_URL"
```

**Storage restore:**
```bash
sudo tar -xzf /var/backups/hptourism/<timestamp>/storage.tar.gz \
  -C /var/lib/hptourism
# ensure ownership
sudo chown -R hptourism:hptourism /var/lib/hptourism/storage
```

## Retention
- Automated retention may be configured in the running service (some scripts prune after 7 days). Check your timer/service definition and adjust as needed:
  ```bash
  sudo systemctl cat homestay-r1-backup.service
  ```
- If desired, add a cron/systemd task to prune `/var/backups/hptourism` beyond your retention window (e.g., `find /var/backups/hptourism -type f -mtime +14 -delete`).

## Notes
- Ensure `.env` contains a valid `DATABASE_URL` before running backups.
- Backup destination should have sufficient space; database dumps and storage archives can grow quickly with uploads.
- Always test a restore on a staging environment before relying on backups for DR.
