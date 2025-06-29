# AoE2 Match History & APM Static Site Generator

site: https://aoe2.site

## Overview
This project automatically fetches and processes your **Age of Empires II: Definitive Edition (AoE2:DE)** recorded games, generating a modern React-based website with detailed APM (actions per minute) charts and match statistics. It runs as a Cloud Run job that polls for new matches every 15 minutes, processes them, and updates the static site.

## Features
- **Automated Match Processing**
  - Polls RelicLink API every 15 minutes for new matches
  - Downloads and processes rec files automatically
  - Updates site with new matches in real-time

- **Player Search**
  - Search for players by name using Relic API
  - Automatic Steam authentication and session management
  - Persistent session storage with Firestore
  - Optimized caching for performance

- **Modern UI with Medieval Design**
  - Responsive design optimized for mobile, tablet, and desktop
  - Medieval-themed color palette and typography
  - Interactive match timeline with detailed breakdowns
  - Team composition and civilization information
  - Winner/team logic with clear visualization
  - Professional landing page with logo branding

## Architecture

### Static vs Dynamic Components
- **Dynamic UI**: React application serves the main interface (match browsing, filtering, responsive design)
- **Static Charts**: APM charts are pre-generated Python files served directly from GCS bucket

### Data Flow

#### Development
1. Python backend processes rec files → generates static APM charts + match JSON files
2. Vite server serves React app + provides middleware for match data access from `/data` directory
3. React app fetches match data through Vite middleware and renders responsive UI

#### Production
1. Python backend processes rec files → uploads static APM charts + match JSON files to GCS bucket
2. React app is built and deployed to GCS bucket, served via Cloudflare
3. Cloud Function at `/functions/proxy` handles API calls to external services (RelicLink, Steam)
4. React app fetches match data directly from GCS bucket URLs
5. Users can click through to static APM chart pages served from GCS

## Documentation

📖 **[UI Development Guide](ui/README.md)** - Component architecture, responsive design system, and frontend development guidelines

📋 **Infrastructure Guide** (below) - Backend services, deployment, and Cloud infrastructure

## Quick Start
1. Clone the repository
2. Set up Google Cloud credentials
3. Push to master to trigger automated deployment

## Development

### Prerequisites
- Python 3.11+
- Node.js 20.x
- npm
- Docker
- Google Cloud SDK
- GitHub CLI (for local action testing)
- Firebase CLI (for local development)

### Local Development

#### Frontend (UI Development)
```bash
cd ui
npm install
npm run dev        # Start development server
npm run dev:all    # Start all services (UI + proxy + Firestore emulator)
npm run test       # Run tests
npm run cy:open    # Open Cypress for testing
```

See the **[UI README](ui/README.md)** for detailed frontend development guidelines.

#### Backend (Match Processing)
1. Set up Python environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the root directory with:
   ```
   VITE_API_URL=http://localhost:5001/aoe2-site/us-east1/aoe2-api-proxy
   ```

#### Player Search API (Local Development)
1. Create a `.env` file in `functions/proxy/`:
   ```
   STEAM_API_KEY=your_steam_api_key
   RELIC_AUTH_STEAM_USER=your_steam_username
   RELIC_AUTH_STEAM_PASS=your_steam_password
   ```

2. Start the API services:
   ```bash
   cd ui
   npm run dev:api  # Starts proxy + Firestore emulator
   ```

3. Test the API:
   ```bash
   curl "http://localhost:8080/api/player-search?name=playerName"
   ```

### Player Data Collection & Firestore Ingestion

The project includes scripts for collecting player data from the AoE2 API and uploading it to Firestore for the player search functionality.

#### 1. Collect Player Data
Use the data collection script to gather player information from the AoE2 API:

```bash
# Activate Python environment
source venv/bin/activate

# Collect player data with rate limiting (50 RPS)
python scripts/collect_player_data.py

# Optional: Resume collection from a specific point
python scripts/collect_player_data.py --resume-from-id 12345
```

The script:
- Processes players in batches of 200 IDs per API request
- Implements rate limiting (50 requests per second)
- Uses 25 concurrent workers for improved performance
- Automatically resumes from interruptions
- Saves data in JSONL format (`player_data_YYYYMMDD_HHMMSS.jsonl`)
- Filters out players with 0 matches

#### 2. Upload to Firestore
After collecting data, upload it to Firestore:

```bash
# Upload collected data to Firestore
python scripts/upload_to_firestore.py player_data_20241210_123456.jsonl

# Monitor progress - the script shows detailed worker statistics
```

The upload script:
- Uses 8 concurrent workers for efficient uploads
- Processes data in batches of 500 players
- Overwrites existing records with updated data
- Shows real-time progress with worker distribution
- Typically processes ~1M players efficiently

#### 3. Development Setup Options

**Option A: Local Development with Production Data**
```bash
cd ui
npm run dev:all:prod  # Connect to production Firestore
```

**Option B: Local Development with Emulator + Test Data**
```bash
cd ui
npm run dev:all       # Uses local emulator with auto-seeded test data
```

The emulator is automatically seeded with test players for development and testing.

#### Data Structure
Player records in Firestore include:
- `profile_id` - Unique player identifier
- `name` - Display name
- `name_no_special` - Cleaned name for search (prefix matching)
- `total_matches` - Total match count
- `country` - Country code (2-letter ISO)
- `last_match_date` - Timestamp of last match
- `clan` - Clan information (if available)

## Frontend (UI) Guidelines

- All responsive and theming logic is centralized in the UI package. See `ui/README.md` for details.
- Static assets are managed and served from Google Cloud Storage, with CDN caching in production.
- Automated tests (unit and component) are run via Jest and Cypress.

## Production

### Infrastructure

#### Google Cloud Services
- Cloud Run Jobs
- Artifact Registry
- Cloud Storage
- Cloud Scheduler
- Cloud Run (API Proxy)
- Firestore (for session management)

#### API Proxy Setup
The project uses a Cloud Run service as a proxy to external APIs (RelicLink, Steam) with Cloudflare DNS for caching and SSL termination.

1. **Cloud Run Domain Mapping**
   ```bash
   # Set project and region
   gcloud config set project aoe2-site
   gcloud config set run/region us-east1

   # Create domain mapping for the API proxy service
   gcloud beta run domain-mappings create \
     --service aoe2-api-proxy \
     --domain api.aoe2.site \
     --platform managed \
     --region us-east1

   # Verify mapping and get DNS target
   gcloud beta run domain-mappings describe \
     --domain api.aoe2.site \
     --platform managed \
     --region us-east1
   ```

2. **Cloudflare DNS Configuration**
   - Create a CNAME record in Cloudflare:
     - Name: `api`
     - Target: `ghs.googlehosted.com`
     - Enable proxy (orange cloud)
   - This setup allows Cloudflare to:
     - Handle SSL termination
     - Cache API responses
     - Protect against DDoS attacks

3. **Verify Setup**
   ```bash
   # Check DNS resolution
   dig +short api.aoe2.site CNAME

   # Test API endpoint
   curl -I https://api.aoe2.site/api/steam/avatar/76561198377637238
   ```

#### Required IAM Roles
The service account (`aoe2-site-bot@aoe2-site.iam.gserviceaccount.com`) needs:
- `roles/run.admin` - Manage Cloud Run jobs
- `roles/artifactregistry.writer` - Push to Artifact Registry
- `roles/storage.admin` - Manage GCS buckets
- `roles/run.invoker` - Invoke Cloud Run jobs
- `roles/iam.serviceAccountUser` - Act as the service account
- `roles/cloudscheduler.admin` - Manage Cloud Scheduler jobs
- `roles/datastore.user` - Access Firestore for session management

Grant roles:
```bash
gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud artifacts repositories add-iam-policy-binding aoe2-repo \
  --location=us-east1 \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### Automated Deployment
The project uses GitHub Actions for automated deployment:

1. **Frontend Deployment** (`.github/workflows/deploy.yml`):
   - Triggered on push to master
   - Builds the React app
   - Uploads the built files to GCS bucket
   - Deploys Cloud Function with Firestore support

2. **Backend Deployment** (`.github/workflows/cloud-run.yml`):
   - Triggered on push to master
   - Builds and pushes Docker image
   - Updates Cloud Run job configuration
   - Updates Cloud Scheduler frequency (creates if doesn't exist)

Required GCS bucket setup (one-time):
```bash
# Create bucket
gsutil mb -l us-east1 gs://aoe2.site

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://aoe2.site

# Set website configuration
gsutil web set -m index.html -e index.html gs://aoe2.site
```

### Testing Production Pipeline
1. Build and test Docker image:
   ```bash
   docker build -t aoe2-match-history:latest .
   docker run --rm -it \
     -v /path/to/your/credentials.json:/tmp/creds.json:ro \
     -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/creds.json \
     aoe2-match-history:latest
   ```

2. Test GitHub Actions locally:
   ```bash
   # Create service account key
   gcloud iam service-accounts keys create sa-key.json \
     --iam-account=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com

   # Test site deployment
   GITHUB_TOKEN=$(gh auth token -h github.com) act push -W .github/workflows/deploy.yml -j build-and-deploy --secret GCP_SA_KEY="$(cat sa-key.json)"  --container-architecture linux/amd64 

   # Test Cloud Run deployment
   GITHUB_TOKEN=$(gh auth token -h github.com) act push -W .github/workflows/cloud-run.yml --job build-and-push --secret GCP_SA_KEY="$(cat sa-key.json)"
   ```

### Manual Deployment
If automated deployment fails, you can deploy manually:

1. Create Artifact Registry repository (one-time):
   ```bash
   gcloud artifacts repositories create aoe2-repo \
     --repository-format=docker \
     --location=us-east1 \
     --description="AoE2 Docker images"
   ```

2. Build and push Docker image:
   ```bash
   gcloud auth configure-docker us-east1-docker.pkg.dev
   docker buildx build --platform linux/amd64 \
     -t us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest .
   docker push us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest
   ```

3. Create/update Cloud Run job:
   ```bash
   gcloud beta run jobs update aoe2-match-history-job \
     --image=us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest \
     --region=us-east1 \
     --memory=2Gi \
     --service-account=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com
   ```

4. Set up Cloud Scheduler (one-time):
   ```bash
   gcloud scheduler jobs create http aoe2-match-history-job-trigger \
     --schedule="*/15 * * * *" \
     --uri="https://us-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/aoe2-site/jobs/aoe2-match-history-job:run" \
     --http-method=POST \
     --oauth-service-account-email=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com \
     --location=us-east1
   ```

### Monitoring
- View job executions: [Cloud Run Job Executions](https://console.cloud.google.com/run/jobs/details/us-east1/aoe2-match-history-job/executions?project=aoe2-site)
- Check logs in Cloud Console
- Monitor GCS bucket for new matches

## API Endpoints

- `GET /api/steam/avatar/{steamId}` - Get Steam avatar
- `GET /api/match-history/{profileId}` - Get match history
- `GET /api/personal-stats/{profileId}` - Get personal stats
- `GET /api/player-search?name={playerName}` - Search for players (new)

## Troubleshooting
- If GitHub Actions fail, check the service account permissions
- If Cloud Run job fails, check the logs in Cloud Console
- If site deployment fails, verify GCS bucket permissions
- For local testing issues, ensure all prerequisites are installed

## Cache Management

### Long-lived Files
Some files like `rl_api_mappings.json` have long cache times (24 hours) for performance. If you update these files and need immediate cache refresh:

```bash
# Purge Cloudflare cache for specific file
export API_TOKEN=your_cloudflare_api_token
export ZONE_ID=your_zone_id
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://aoe2.site/data/rl_api_mappings.json"
    ]
  }'
```

Alternatively, use the Cloudflare Dashboard: **Caching** → **Configuration** → **Purge Cache** → **Custom Purge**.

## Data/API References
- [RelicLink API](https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/)
- [RecentMatchHistory LibreMatch](https://wiki.librematch.org/rlink/game/leaderboard/getrecentmatchhistory)
- Civ mapping: [100.json](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- [mgz Python library](https://github.com/happyleavesaoc/python-mgz)
- [worlds edge api client](https://github.com/oliverfenwick90/edgelink-api-client/blob/main/src/util.ts#L3)
- [age lan server](https://github.com/luskaner/ageLANServer/tree/d52e38b647f1226255dd74b4ab3f6d7ee08720d1)
- [libre match thread](https://discord.com/channels/952812514272489503/1023626327342993511)
- [aoe companion](https://github.com/denniske/aoe2companion)
- [slot metadata parsing](https://github.com/librematch/librematch-collector/blob/90909b784cb5e8366794ffb5bafeb45ad0756916/collector/src/parser/advertisement/advertisement-players.ts#L24)
- [leaderboard mapping](https://github.com/librematch/librematch-collector/blob/90909b784cb5e8366794ffb5bafeb45ad0756916/collector/src/parser/match.ts#L8)
- [auth flow](https://github.com/librematch/librematch-steam_auth/blob/main/poc_steam_proxy/__init__.py)
- [steam api](https://steamwebapi.azurewebsites.net/)