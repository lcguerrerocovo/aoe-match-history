# AoE2 Match History & APM Static Site Generator

site: https://aoe2-match-history-site.storage.googleapis.com/index.html

---

## Overview
This project fetches, processes, and visualizes **Age of Empires II: Definitive Edition (AoE2:DE)** recorded games (recs) for your own matches. It generates a static website with detailed APM (actions per minute) charts and match/player summaries.

---

## Features
- Polls the official RelicLink API for recent matches and downloads rec files
- Parses recs and generates interactive APM charts (**Bokeh/Chartify**)
- Static HTML site with per-match and per-player summaries
- Civilization mapping using Siege Engineers reference data
- Clear winner/team logic and match metadata
- Deterministic, reproducible outputs

---

## Directory Structure
- `generate_apm_site.py`: Main static site generator
- `aoe2_poller.py`: Polls and downloads new recs
- `utils/aoe_rec.py`: Rec parsing and summary extraction
- `utils/viz.py`: APM chart generation
- `100.json`: Civilization mapping
- `site/`: Generated static site
- `recs/`: Downloaded/extracted rec files
- `requirements.txt`: Python dependencies

---

## Setup
1. **Clone the repository**
2. *(Recommended)* Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. *(Optional)* Set up a cron job to automate polling and site generation

## Development

See [ui/README.md](ui/README.md) for frontend development instructions.

---

## Usage
1. **Run the poller to fetch new recs:**
   ```bash
   python aoe2_poller.py
   ```
2. **Generate/update the static site:**
   ```bash
   python generate_apm_site.py
   ```
3. **Open** `site/index.html` **in your browser**

---

## Data/API References
- [RelicLink API](https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/)
- Civ mapping: [100.json](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- [mgz Python library](https://github.com/happyleavesaoc/python-mgz)

---

## Notes
- All HTML is generated statically; **no server required**
- Notebooks and exploratory analysis are **not included** in this repo

---

## Local Development

### Python Backend
1. **Clone the repository**
2. *(Recommended)* Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the poller and generate static site:**
   ```bash
   python aoe2_poller.py
   python generate_apm_site.py
   ```

### React Frontend
1. **Install Node.js dependencies:**
   ```bash
   cd ui
   npm install
   ```
2. **Start development server:**
   ```bash
   npm run dev
   ```
   This will start the Vite dev server at http://localhost:5173

### Full Stack Development
1. **Run the Python backend to generate data:**
   ```bash
   python aoe2_poller.py
   python generate_apm_site.py
   ```
2. **Start the React frontend:**
   ```bash
   cd ui
   npm run dev
   ```
3. **Build for production:**
   ```bash
   cd ui
   npm run build
   ```
   This will create a `dist` directory with the production build.

### Testing the Full Pipeline
1. **Build and run the Docker container:**
   ```bash
   docker build -t aoe2-match-history:latest .
   docker run --rm -it \
     -v /path/to/your/credentials.json:/tmp/creds.json:ro \
     -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/creds.json \
     aoe2-match-history:latest
   ```
   This will:
   - Run the poller to fetch new matches
   - Generate the static site with APM charts
   - Build the React app
   - Deploy everything to GCS using gsutil

   To test with service account credentials (matching production environment):
   1. Create a service-account key:
      ```bash
      gcloud iam service-accounts keys create sa-key.json \
          --iam-account=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com
      ```
   2. Build for amd64 (if on Apple Silicon/ARM):
      ```bash
      docker buildx build \
          --platform linux/amd64 \
          --progress=plain \
          -t aoe2-match-history:latest \
          .
      ```
   3. Run with service account:
      ```bash
      docker run --rm -it \
          --platform linux/amd64 \
          -v "$(pwd)/sa-key.json:/tmp/creds.json:ro" \
          -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/creds.json \
          -e PYTHONUNBUFFERED=1 \
          aoe2-match-history:latest
      ```

---

## Google Cloud Deployment

### 0. Create Artifact Registry Repository *(one-time)*
Before pushing your image, create the repository:
```sh
gcloud artifacts repositories create aoe2-repo \
  --repository-format=docker \
  --location=us-east1 \
  --description="AoE2 Docker images"
```

### 1. Build and Push Docker Image to Artifact Registry
Authenticate Docker with Google:
```sh
gcloud auth configure-docker us-east1-docker.pkg.dev
```
Build your image:
```sh
# For most users (x86_64):
docker build -t us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest .
# If you are on Apple Silicon (M1/M2) or ARM, build for Cloud Run compatibility:
docker buildx build --platform linux/amd64 -t us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest .
```
Push your image:
```sh
docker push us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest
```

### 2. Deploy and Run as a Cloud Run Job
Create the Cloud Run Job:
```sh
gcloud beta run jobs create aoe2-match-history-job \
  --image=us-east1-docker.pkg.dev/aoe2-site/aoe2-repo/aoe2-match-history:latest \
  --region=us-east1
```

**Update config / memory settings:**
```sh
gcloud beta run jobs update aoe2-match-history-job \
  --region=us-east1 \
  --memory=2Gi \
  --service-account=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com \
  --port=8080
```

**Run the job manually:**
```sh
gcloud beta run jobs execute aoe2-match-history-job --region=us-east1
```

### 3. Set Up Cloud Scheduler (Cron)
- To run the job every 15 minutes, use the following cron schedule: `*/15 * * * *`
- Create the Cloud Scheduler job to trigger your Cloud Run Job:

```sh
gcloud scheduler jobs create http aoe2-match-history-job-trigger \
  --schedule="*/15 * * * *" \
  --uri="https://us-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/aoe2-site/jobs/aoe2-match-history-job:run" \
  --http-method=POST \
  --oauth-service-account-email=aoe2-site-bot@aoe2-site.iam.gserviceaccount.com \
  --location=us-east1
```

- Replace `aoe2-site-bot@aoe2-site.iam.gserviceaccount.com` with your Cloud Run Job's service account email if different.
- This will trigger the job every 15 minutes.

---

### 4. Monitor Logs
Monitor job via this URL:
[Cloud Run Job Executions](https://console.cloud.google.com/run/jobs/details/us-east1/aoe2-match-history-job/executions?project=aoe2-site)

---

### 5. IAM & Permissions
- Ensure your Cloud Run Job's service account has permissions for:
  - Reading/writing to your GCS buckets (`aoe2-recs`, `aoe2-match-history-site`)
  - (Optional) Pub/Sub if using Cloud Scheduler with Pub/Sub
- **Grant Cloud Run Invoker role to the service account used by Cloud Scheduler:**
  ```sh
  gcloud projects add-iam-policy-binding aoe2-site \
    --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
    --role="roles/run.invoker"
  ```
- **Grant Storage Admin role for GCS bucket management:**
  ```sh
  gcloud projects add-iam-policy-binding aoe2-site \
    --member="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
  ```

---

### 6. (Optional) Delete Old Cloud Run Service
If you previously deployed as a Cloud Run service, delete it:
```sh
gcloud run services delete aoe2-match-history --region=us-east1
```

---

**References:**
- [Cloud Run Jobs Overview](https://cloud.google.com/run/docs/jobs)
- [Cloud Run Jobs Quickstart](https://cloud.google.com/run/docs/quickstarts/jobs)
- [Cloud Scheduler + Cloud Run](https://cloud.google.com/scheduler/docs/tut-pub-sub)
- [Artifact Registry Docker](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling) 