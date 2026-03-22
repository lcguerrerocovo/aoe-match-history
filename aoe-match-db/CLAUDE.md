# PostgreSQL VM — Match History Database

GCE e2-medium VM running PostgreSQL 16. Stores all collected match history data for the full match history feature.

## Scripts

- `deploy-vm.sh` — Creates/updates the GCE VM (e2-medium, Debian 12, 20GB SSD). Requires `MATCH_DB_PASSWORD` env var. Calls `firewall.sh` automatically.
- `startup.sh` — VM boot script: installs PostgreSQL 16, configures networking (listen on all interfaces, allow 10.0.0.0/8), creates database `aoe2_matches` and user `collector`, installs backup cron.
- `firewall.sh` — Creates firewall rules: port 5432 internal-only (10.0.0.0/8), SSH public.
- `backup.sh` — Manual backup: `pg_dump` → gzip → GCS (`gs://aoe2-site-backups/pg/`). Also embedded in startup.sh for cron.
- `migrate-db.sh` — Opens SSH tunnel, runs node-pg-migrate, closes tunnel. Requires `MATCH_DB_PASSWORD` env var.

## Secrets

`MATCH_DB_PASSWORD` is stored in **GitHub repo secrets** (same pattern as `MEILI_MASTER_KEY` for `aoe-search/`). Export it locally when running deploy or migration scripts. Future CI workflows (collector deploy, proxy deploy) reference it via `secrets.MATCH_DB_PASSWORD`.

**Important:** Use alphanumeric characters and dashes only — special chars (`!@*'`) cause escaping issues across shell, SQL, and URL contexts.

## Deployment

```bash
export MATCH_DB_PASSWORD="<from GitHub repo secrets>"
cd aoe-match-db && bash deploy-vm.sh
```

After VM is up (~2-3 min), run migrations:
```bash
MATCH_DB_PASSWORD="$MATCH_DB_PASSWORD" bash aoe-match-db/migrate-db.sh
```

No CI pipeline — deployed manually when VM config changes (same pattern as `aoe-search/`).

## Schema Management

Schema is managed via node-pg-migrate in `jobs/collector/migrations/`. The collector owns the schema since it's the primary writer. See `jobs/collector/CLAUDE.md` for migration commands.

## Backups

Daily `pg_dump` at 04:00 UTC to `gs://aoe2-site-backups/pg/` with 7-day retention. Cron installed automatically by `startup.sh`.

## Connection

- **Internal** (Cloud Run / Cloud Run Jobs): `postgresql://collector:***@<INTERNAL_IP>:5432/aoe2_matches`
- **Local dev**: `bash scripts/tunnel-postgres.sh` then `localhost:5432`
- Password passed via GCE metadata (`db_password` key)

## Gotchas

- Port 5432 is internal-only — use SSH tunnel for local access (`scripts/tunnel-postgres.sh`)
- Startup script is idempotent but does NOT update existing role passwords — use `ALTER ROLE` via psql if password changes
- Password must avoid special characters (see Secrets section)
