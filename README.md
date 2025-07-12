# AoE2 Match History

site: https://aoe2.site

## Overview
This project provides a modern React-based website for viewing **Age of Empires II: Definitive Edition (AoE2:DE)** match history and player statistics. It features a responsive interface with player search, detailed match statistics, and medieval-themed design.

## Features
- **Player Search**
  - Search for players by name using Relic API
  - Automatic Steam authentication and session management
  - Persistent session storage with Firestore
  - Optimized caching for performance
  - **Fast typo-tolerant search with Meilisearch**

- **Match History Viewing**
  - Detailed match statistics and team compositions
  - Civilization and map information
  - Winner/team logic with clear visualization
  - Interactive match filtering and sorting

- **Modern UI with Medieval Design**
  - Responsive design optimized for mobile, tablet, and desktop
  - Medieval-themed color palette and typography
  - Professional landing page with logo branding
  - Dark/light theme toggle

## Architecture

### Components
- **React UI**: Modern responsive interface for browsing match history and player stats
- **Cloud Function API**: Proxy service for external API calls (RelicLink, Steam)
- **Static Hosting**: UI served from Google Cloud Storage with Cloudflare CDN
- **Meilisearch**: Fast, typo-tolerant search engine for player lookup

### Data Flow

#### Development
1. Vite dev server serves React app with hot reloading
2. Local Cloud Function proxy handles API calls to external services
3. Firestore emulator provides local database for testing

#### Production
1. React app is built and deployed to GCS bucket, served via Cloudflare
2. Cloud Function at `/functions/proxy` handles API calls to external services (RelicLink, Steam)
3. React app fetches data through the Cloud Function API proxy
4. **Meilisearch VM provides fast player search functionality**

## Documentation

📖 **[UI Development Guide](ui/README.md)** - Component architecture, responsive design system, and frontend development guidelines

📋 **Infrastructure Guide** (below) - API proxy deployment and Cloud infrastructure

## Quick Start
1. Clone the repository
2. Set up frontend development environment
3. Configure API proxy for player search functionality
4. **Deploy Meilisearch search engine**

## Meilisearch Search Engine

The project uses Meilisearch for fast, typo-tolerant player search, replacing the previous Firestore-based search.

### Deployment

#### 1. Deploy the Search VM
```bash
# Deploy Meilisearch VM with automatic configuration
bash scripts/deploy.sh

# Or with custom master key
MEILI_MASTER_KEY="your-secure-key" bash scripts/deploy.sh
```

The deployment script:
- Creates an e2-micro VM in `us-central1-a` (free tier compatible)
- Installs Docker and Meilisearch automatically
- Configures the search index using `scripts/meilisearch_config.json`
- Sets up firewall rules for internal access
- Provides environment variables for indexing

#### 2. Filter and Index Player Data
```bash
# Filter active players (matches > 0, active in last 2 years)
python scripts/filter_active_players.py data/collected_players.jsonl data/active_players.jsonl

# Index the filtered data
export MEILI_HTTP_ADDR="http://34.58.214.230:7700"
export MEILI_MASTER_KEY="a-secure-master-key-change-this"
python scripts/index_from_jsonl.py data/active_players.jsonl
```

#### 3. Update Cloud Function
Update your Cloud Function environment variables:
```bash
MEILISEARCH_HOST="http://34.58.214.230:7700"
MEILISEARCH_API_KEY="a-secure-master-key-change-this"
```

### Management and Troubleshooting

#### SSH Access
```bash
# Connect to the VM
gcloud compute ssh aoe-search-vm --zone=us-central1-a --project=aoe2-site
```

#### Health Checks
```bash
# Check if Meilisearch is running
curl http://localhost:7700/health

# Check from external (if firewall allows)
curl http://<EXTERNAL_IP>:7700/health

# Check Docker container status
sudo docker ps
```

#### Logs and Monitoring

**Startup Script Logs** (most important):
```bash
# Real-time startup script execution
sudo journalctl -u google-startup-scripts.service -f

# Recent startup logs
sudo journalctl -u google-startup-scripts.service --since "1 hour ago"
```

**Meilisearch Application Logs**:
```bash
# Real-time Meilisearch logs
sudo docker logs meilisearch -f

# Recent Meilisearch logs
sudo docker logs meilisearch --since "1h"
```

**System Logs**:
```bash
# All system logs
sudo journalctl -f

# Check startup script status
sudo systemctl status google-startup-scripts.service
```

#### Search Testing
```bash
# Test search from VM
curl -X POST 'http://localhost:7700/indexes/players/search' \
  -H "Authorization: Bearer your-master-key" \
  -H 'Content-Type: application/json' \
  --data-binary '{"q": "viper"}'

# Test from external (if firewall allows)
curl -X POST 'http://<EXTERNAL_IP>:7700/indexes/players/search' \
  -H "Authorization: Bearer your-master-key" \
  -H 'Content-Type: application/json' \
  --data-binary '{"q": "viper"}'
```

#### Firewall Management
```bash
# List firewall rules
gcloud compute firewall-rules list --filter="name~meilisearch"

# Allow external access (for testing)
gcloud compute firewall-rules create allow-meilisearch-external \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:7700 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=meilisearch-server \
  --description="Allow external access to Meilisearch (for testing)"

# Remove external access (for production)
gcloud compute firewall-rules delete allow-meilisearch-external
```

#### Container Management
```bash
# Restart Meilisearch
sudo docker restart meilisearch

# View container details
sudo docker inspect meilisearch

# Check resource usage
sudo docker stats meilisearch
```

#### Index Management
```bash
# Get index statistics
curl -H "Authorization: Bearer your-master-key" \
  http://localhost:7700/indexes/players/stats

# Get index settings
curl -H "Authorization: Bearer your-master-key" \
  http://localhost:7700/indexes/players/settings

# Clear and reindex (if needed)
curl -X DELETE -H "Authorization: Bearer your-master-key" \
  http://localhost:7700/indexes/players
```

### Configuration

#### Search Index Settings
The search index is configured via `scripts/meilisearch_config.json`:
- **Searchable fields**: `name`, `alias`
- **Filterable fields**: `country`, `total_matches`, `last_match_date`
- **Sortable fields**: `total_matches`, `last_match_date`
- **Ranking rules**: Prioritizes players with more matches and recent activity
- **Typo tolerance**: Enabled for better search experience

#### Performance Tuning
For the e2-micro VM:
- **Memory limit**: 400MB for indexing
- **Threads**: 2 concurrent indexing threads
- **Batch size**: 1000 documents per batch

### Backup and Recovery
```bash
# Create index dump
curl -X POST -H "Authorization: Bearer your-master-key" \
  http://localhost:7700/dumps

# List available dumps
curl -H "Authorization: Bearer your-master-key" \
  http://localhost:7700/dumps

# Restore from dump
curl -X POST -H "Authorization: Bearer your-master-key" \
  -H "Content-Type: application/json" \
  --data-binary '{"dumpUid": "dump_uid_here"}' \
  http://localhost:7700/dumps/import
```

## Development

### Prerequisites
- Node.js 20.x
- npm
- Google Cloud SDK (for deployment)
- Firebase CLI (for local development)
- **Python 3.8+ (for data processing scripts)**

### Python Environment Setup

The project requires Python dependencies for data processing scripts and Cloud Functions. Set up a Python environment using `pyenv` and `pyenv-virtualenv`:

```bash
# Install pyenv (if not already installed)
# On macOS with Homebrew:
brew install pyenv pyenv-virtualenv
pyenv install 3.11.7
pyenv virtualenv 3.11.7 aoe-match-history
pyenv local aoe-match-history

# Install all dependencies (data processing + Cloud Functions)
pip install -r requirements.txt

# Verify installations
python -c "import meilisearch; print('Meilisearch client installed successfully')"
python -c "import functions_framework; print('Cloud Functions framework installed successfully')"
```

**Important**: The virtual environment is automatically activated when you're in the project directory. If you need to activate it manually:
```bash
pyenv activate aoe-match-history
```

**Note**: If you don't have `pyenv` installed, you can use the system Python, but `pyenv` is recommended for consistent Python version management across projects.

#### Development vs Production Dependencies

- **Development**: All dependencies installed in root virtual environment (`requirements.txt`)
- **Production**: Each Cloud Function installs its own dependencies (`pip install -r requirements.txt -t .`)

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
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

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
- `name_tokens` - Array of searchable tokens for partial name matching
- `total_matches` - Total match count
- `country` - Country code (2-letter ISO)
- `last_match_date` - Timestamp of last match
- `clan` - Clan information (if available)

### Firestore Index Management

Player search uses composite indexes defined in `firestore.indexes.json`:
- **Prefix Search**: `name_no_special` + `total_matches` (for "gl" → "GL.TheViper")  
- **Token Search**: `name_tokens` + `total_matches` (for "viper" → "GL.TheViper")

**Deploy Changes**: `firebase deploy --only firestore:indexes` (5-15 min build time)

## Frontend (UI) Guidelines

- All responsive and theming logic is centralized in the UI package. See `ui/README.md` for details.
- Static assets are managed and served from Google Cloud Storage, with CDN caching in production.
- Automated tests (unit and component) are run via Jest and Cypress.

## Production

### Infrastructure

#### Google Cloud Services
- Cloud Run (API Proxy)
- Cloud Storage (static hosting)
- Firestore (session management and player data)

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
- `roles/run.admin` - Manage Cloud Run services
- `roles/storage.admin` - Manage GCS buckets
- `roles/run.invoker` - Invoke Cloud Run services
- `roles/iam.serviceAccountUser` - Act as the service account
- `roles/datastore.user` - Access Firestore for session management
- `roles/compute.viewer` - View compute instances (for Meilisearch VM detection)

Grant roles:
```bash
gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/compute.viewer"
  
gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding aoe2-site \
  --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Cloudflare Integration

The deployment workflow automatically clears Cloudflare cache for updated endpoints. You'll need to add these secrets to your GitHub repository:

- `CLOUDFLARE_API_TOKEN` - API token with Zone:Zone:Edit and Zone:Cache Purge permissions
- `CLOUDFLARE_ZONE_ID` - Zone ID for your domain (found in Cloudflare dashboard)

**To get these values:**

1. **API Token**: Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Use "Custom token" template
   - Permissions: Zone:Zone:Edit, Zone:Cache Purge
   - Zone Resources: Include → Specific zone → aoe2.site

2. **Zone ID**: Go to Cloudflare Dashboard → aoe2.site → Overview → Zone ID (right sidebar)


### Automated Deployment
The project uses GitHub Actions for automated deployment:

**Frontend & API Deployment** (`.github/workflows/deploy.yml`):
- Triggered on push to master
- Builds the React app
- Uploads the built files to GCS bucket
- Deploys Cloud Function with Firestore support

Required GCS bucket setup (one-time):
```bash
# Create bucket
gsutil mb -l us-east1 gs://aoe2.site

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://aoe2.site

# Set website configuration
gsutil web set -m index.html -e index.html gs://aoe2.site
```

## API Endpoints

- `GET /api/steam/avatar/{steamId}` - Get Steam avatar
- `GET /api/match-history/{profileId}` - Get match history
- `GET /api/personal-stats/{profileId}` - Get personal stats
- `GET /api/player-search?name={playerName}` - Search for players (new)

## Troubleshooting
- If GitHub Actions fail, check the service account permissions
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

to clear cached search queries when search changes are deployed, run the following:

```bash
export CF_API_TOKEN=your_cloudflare_api_token
export CF_ZONE_ID=your_zone_id
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://api.aoe2.site/api/player-search",
      "https://api.aoe2.site/api/player-search?name=*"
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