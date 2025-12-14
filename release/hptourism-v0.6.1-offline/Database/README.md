# Database & Seeds (homestay_r1)

This folder holds everything needed to stand up the local/staging database for the **homestay_r1** release.  
We standardised the naming so the application bundle, database, and backup tooling all point to the same locations.

## Default Parameters

| Setting              | Value / Path                              | Notes |
|----------------------|-------------------------------------------|-------|
| DB host / port       | `localhost:5432`                          | Postgres lives on the same VM |
| DB name              | `homestay_r1`                             | Formerly `hptourism_stg_rc3` |
| DB user/password     | `postgres / postgres`                     | Dev/staging only – rotate before prod |
| Release root         | `/home/subhash.thakur.india/homestay1`    | Installer drops binaries + backups here |
| Upload store         | `<repo-root>/local-object-storage`        | Can be bind-mounted to another disk |

`Database/db-config.env` mirrors these values and is sourced by seeds + backup scripts.  
Update that file if you relocate Postgres or change credentials.

## Folder Map

| File / Folder | Purpose |
|---------------|---------|
| `full_schema.sql` | Master schema dump (tables, enums, indexes). Apply this first on an empty DB. |
| `admin_accounts_seed.sql` | Inserts super admin + admin accounts with hashed passwords. |
| `district_staff_seed.sql` | Default DA/DTDO roster (usernames, emails, hashed passwords). |
| `ddo_codes_seed.sql` | Canonical DDO → district/tehsil mapping (Hamirpur/Una, Lahaul/Kaza, Chamba split). |
| `lgd_schema.sql` | Latest LGD directory (district, tehsil, block, GP). Generated from the 26‑May‑2025 LGD XML. |
| `scripts/backup.sh` | Unified backup script (Postgres dump + upload archive + retention). |

## Bring-up Checklist

1. **Install / start PostgreSQL 16**
   ```bash
   sudo systemctl enable --now postgresql
   ```
2. **Create the homestay_r1 DB**
   ```bash
   sudo -u postgres createdb homestay_r1
   ```
3. **Load the master schema + seeds**
   ```bash
   cd /home/subhash.thakur.india/Projects/hptourism-stg-rc3
   sudo -u postgres psql -d homestay_r1 -f Database/full_schema.sql
   sudo -u postgres psql -d homestay_r1 -f Database/admin_accounts_seed.sql
   sudo -u postgres psql -d homestay_r1 -f Database/district_staff_seed.sql
   sudo -u postgres psql -d homestay_r1 -f Database/ddo_codes_seed.sql
   sudo -u postgres psql -d homestay_r1 -f Database/lgd_schema.sql
   ```
4. **Export DB connection vars for app/seed scripts**
   ```bash
   set -a
   source Database/db-config.env
   set +a
   ```
5. **Run the consolidated seed (optional)**
   ```bash
   npx tsx server/seed.ts
   ```
   The TS seed checks for existing records, so it is safe to re-run when refreshing QA data.

## Default Accounts

| Role / Access | Login Identifier | Default Password | Notes |
|---------------|------------------|------------------|-------|
| Super Admin   | `superadmin@himachaltourism.gov.in` | `Ulan@2025`     | Full platform + super console. |
| System Admin  | `admin@himachaltourism.gov.in`      | `Admin@2025`      | Admin dashboard scope. |
| Admin RC      | `admin.rc@hp.gov.in` (username `adminrc`) | `Ulan@2025` | RC operations console + manifest syncs. |
| DA / DTDO     | See `district_staff_seed.sql`       | `da***@2025` / `dtdo***@2025` | Each district pair has unique usernames + mobiles captured in the manifest. |

> Passwords above are already hashed inside the SQL dumps. The plaintext values are documented here so QA teams know what to use immediately after install. Rotate them before handing the environment to external teams.

## LGD Directory & Tehsil Sanity

- The LGD SQL was generated from `PMD/LGD-Master/subdistrictVillageBlockGPsorTLBMapping2025_05_26_16_42_35_956.xml`.  
- Verified counts:
  - **Chamba** – 10 tehsils (Pangi, Bharmour, Holi, Tissa, Churah, etc.) so the DDO logic aligns with the new split.
  - **Lahaul & Spiti** – 3 tehsils (Keylong, Udaipur, Kaza) with two DDO codes (Kaza isolated).
  - **Kullu** – 6 tehsils mapped to the surviving KLU00-532 DDO.
- If NIC/LGD publishes a newer XML, regenerate the SQL (`pg_dump` after import) and drop it in this folder so everyone stays in sync.

## Backup & Restore

Use `Database/scripts/backup.sh` to capture both the database and the upload store.

```bash
cd /home/subhash.thakur.india/Projects/hptourism-stg-rc3
CONFIG_FILE=Database/db-config.env BACKUP_ROOT=/home/subhash.thakur.india/homestay1/backups \
  Database/scripts/backup.sh
```

What it does:
- Runs `pg_dump` against `homestay_r1` and stores the file under `$BACKUP_ROOT/db/`.
- Archives `local-object-storage/` into `$BACKUP_ROOT/files/`.
- Keeps the latest 7 archives by default; change `RETENTION_DAYS` env var to extend.
- Dependencies: `pg_dump`, `tar`, `gzip`, `find`, and (optionally) `rsync` if you mirror the backup directory off-box.

Restore steps (manual):
1. `psql -d homestay_r1 -f <dump.sql>`
2. Extract the tarball back into `local-object-storage/`.

## Documents & References

- The rest of the technical references live under the repo-level `docs/` folder (payment, HimKosh, packaging).
- Installation flow/notes are mirrored in `/Installation` for the release engineers.
- Keep this Database folder as the single source of truth for schemas, seeds, and operational scripts so installers only need to pick up this directory + `.env`.
