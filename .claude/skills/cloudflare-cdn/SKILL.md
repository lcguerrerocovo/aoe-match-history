---
name: cloudflare-cdn
description: Use when deploying changes, purging cache, troubleshooting CDN issues, updating DNS, or when cached data (mappings, assets, search) appears stale after deployment
---

# Cloudflare CDN & Deployment

## Overview

aoe2.site uses Cloudflare as CDN and DNS proxy in front of Google Cloud Storage (static site + assets) and Cloud Run (API proxy). Most deployment is automated via GitHub Actions on push to master, but some cache operations require manual intervention.

## What's Automated (GitHub Actions)

`.github/workflows/deploy.yml` handles on push to master:

| Step | What it does |
|------|-------------|
| Build & upload UI | `npm run build` → `gsutil cp` to `gs://aoe2.site/` |
| Upload assets | civ_icons, maps, logos → `gs://aoe2.site/assets/` with 24h cache |
| Upload data files | `rl_api_mappings.json`, `100.json` → `gs://aoe2.site/data/` with 24h cache |
| Deploy proxy | Cloud Run `aoe2-api-proxy` to `us-central1` |
| Auto cache purge | Purges proxy function URL **only if proxy files changed** |

The workflow detects changes in `functions/proxy/`, `data/`, and `ui/src/assets/` and purges the corresponding Cloudflare cache URLs automatically.

## Manual Cache Purge

### When Needed
- After updating `rl_api_mappings.json` (civ/map mappings) — 24h cache means stale data otherwise
- After updating civ icons or map images
- After search index changes (Meilisearch reindex)
- Any time cached content appears stale in production

### Purge Data Files (mappings)
```bash
export API_TOKEN=your_cloudflare_api_token
export ZONE_ID=your_zone_id
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files": ["https://aoe2.site/data/rl_api_mappings.json"]}'
```

### Purge Search Cache
```bash
export CF_API_TOKEN=your_cloudflare_api_token
export CF_ZONE_ID=your_zone_id
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files": [
    "https://api.aoe2.site/api/player-search",
    "https://api.aoe2.site/api/player-search?name=*"
  ]}'
```

### Purge Everything (nuclear option)
Use Cloudflare Dashboard: **Caching** → **Configuration** → **Purge Cache** → **Purge Everything**

## Credentials

Stored as GitHub Actions secrets:
- `CLOUDFLARE_API_TOKEN` — API token with Zone:Zone:Edit and Zone:Cache Purge permissions
- `CLOUDFLARE_ZONE_ID` — Zone ID for aoe2.site

**To create API token:**
1. Cloudflare Dashboard → My Profile → API Tokens → Create Token
2. Custom token template
3. Permissions: Zone:Zone:Edit, Zone:Cache Purge
4. Zone Resources: Include → Specific zone → aoe2.site

**Zone ID location:** Cloudflare Dashboard → aoe2.site → Overview → right sidebar

## DNS Configuration

| Type  | Name | Target                 | Proxy |
|-------|------|------------------------|-------|
| CNAME | api  | ghs.googlehosted.com.  | Proxied (orange cloud) |

- SSL/TLS mode: **Full** (not Full Strict, not Flexible)
- Universal SSL: enabled

## Cache Headers Set by Deploy

| Content | Cache-Control | Notes |
|---------|--------------|-------|
| `index.html`, `404.html` | `no-cache, max-age=0` | Always fresh |
| `data/*.json` | `public, max-age=86400` | 24 hours — purge after updates |
| `assets/**/*.png` | `public, max-age=86400` | 24 hours — purge after updates |
| JS/CSS bundles | Vite content-hashed filenames | Cache-busted automatically |

## GCS Bucket

- Bucket: `gs://aoe2.site`
- Region: `us-east1`
- Public access: `allUsers:objectViewer`
- Website config: `index.html` as main and error page

## Asset Upload (manual)

For uploading assets outside of CI:
```bash
cd ui && node scripts/upload-assets.js
```
This uploads everything in `ui/src/assets/` to `gs://aoe2.site/assets/`.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Stale mappings after deploy | Data file cached for 24h | Manual purge of `rl_api_mappings.json` |
| Stale civ icons | Asset cached for 24h | Manual purge of specific asset URL |
| 525 SSL error | SSL/TLS mode wrong or cert not provisioned | Set to Full, purge cache, wait for cert |
| 404 on api.aoe2.site | Domain mapping wrong region | Remap with `--region=us-central1` |
| Old search results | Search cache not purged | Purge search URLs |
