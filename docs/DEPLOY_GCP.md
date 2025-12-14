# 🚀 Deploy HP Tourism Ecosystem to Google Cloud Platform

Complete guide for deploying the HP Tourism Digital Ecosystem to Google Cloud Platform (GCP) using Cloud Run and PostgreSQL.

---

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
   - New users get $300 free credits
   - Sign up at: https://cloud.google.com/

2. **GCP Project**
   - Create a new project or use an existing one
   - Note your PROJECT_ID

3. **Database Options** (choose one):
   - **Option A**: Keep using Neon PostgreSQL (simplest - no changes needed)
   - **Option B**: Migrate to Cloud SQL PostgreSQL (fully integrated with GCP)

---

## 🎯 Deployment Options

### Option 1: One-Click Deploy (Fastest - 5 minutes)

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run)

**Steps:**
1. Click the button above
2. Sign in to your Google Cloud account
3. Select or create a GCP project
4. Authorize Cloud Build and Cloud Run APIs
5. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
6. Click "Deploy"
7. Wait 2-3 minutes for build and deployment
8. Get your live URL: `https://hp-tourism-ecosystem-XXXX.run.app`

**After deployment:**
- Visit your URL and use the Dev Console to seed sample data
- Login with demo credentials (see below)

---

### Option 2: Deploy via gcloud CLI (10 minutes)

#### Step 1: Install Google Cloud SDK

```bash
# Download and install
curl https://sdk.cloud.google.com | bash

# Initialize
gcloud init

# Login
gcloud auth login
```

#### Step 2: Enable Required APIs

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

#### Step 3: Create Secrets (Secure Way)

```bash
# Store DATABASE_URL securely
echo -n "postgresql://user:password@host:port/database" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Auto-generate SESSION_SECRET
openssl rand -base64 32 | \
  gcloud secrets create SESSION_SECRET --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SESSION_SECRET \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Step 4: Deploy to Cloud Run

```bash
# Deploy from source (automatic build)
gcloud run deploy hp-tourism-ecosystem \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300s \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest"
```

**Deployment takes ~2-3 minutes**

#### Step 5: Get Your Service URL

```bash
gcloud run services describe hp-tourism-ecosystem \
  --region us-central1 \
  --format='value(status.url)'
```

---

### Option 3: Automated CI/CD with Cloud Build (Production Setup)

#### Step 1: Connect GitHub Repository

```bash
# Install Cloud Build app on GitHub
# https://github.com/marketplace/google-cloud-build

# Or manually connect
gcloud alpha builds triggers create github \
  --repo-name=hp-tourism-ecosystem \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --region=us-central1
```

#### Step 2: Set Up Secrets (one-time)

```bash
# Create secrets as shown in Option 2, Step 3
```

#### Step 3: Push to GitHub

```bash
git push origin main
```

**Automatic deployment triggered on every push to main branch!**

---

## 💾 Database Setup Options

### Option A: Use Neon PostgreSQL (Recommended - Simplest)

**Why Neon?**
- ✅ Already configured in your app
- ✅ Serverless, auto-scaling
- ✅ Free tier available
- ✅ No GCP setup needed

**Setup:**
1. Keep your existing Neon database
2. Get connection string from Neon dashboard
3. Use it as `DATABASE_URL` during deployment

**No code changes needed!**

---

### Option B: Migrate to Cloud SQL PostgreSQL

**Why Cloud SQL?**
- Fully integrated with GCP
- Automatic backups
- High availability options
- GCP IAM authentication

#### Step 1: Create Cloud SQL Instance

```bash
gcloud sql instances create hp-tourism-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup-start-time=03:00 \
  --backup-location=us \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4
```

**Pricing:** ~$7-10/month for db-f1-micro

#### Step 2: Create Database and User

```bash
# Create database
gcloud sql databases create hp_tourism \
  --instance=hp-tourism-db

# Set password for default user
gcloud sql users set-password postgres \
  --instance=hp-tourism-db \
  --password=YOUR_SECURE_PASSWORD
```

#### Step 3: Get Connection String

```bash
# Get instance connection name
gcloud sql instances describe hp-tourism-db \
  --format='value(connectionName)'

# Returns: YOUR_PROJECT_ID:us-central1:hp-tourism-db
```

#### Step 4: Deploy with Cloud SQL

```bash
gcloud run deploy hp-tourism-ecosystem \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:hp-tourism-db \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest"
```

**Connection String Format for Cloud SQL:**
```
postgresql://postgres:PASSWORD@/hp_tourism?host=/cloudsql/PROJECT_ID:us-central1:hp-tourism-db
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `SESSION_SECRET` | Secret for session encryption | Auto-generated if not set |
| `NODE_ENV` | Environment (production/development) | Auto-set to production |
| `PORT` | Port number | Auto-set by Cloud Run (8080) |

### Resource Limits

Default configuration (can be adjusted):
- **Memory**: 512Mi
- **CPU**: 1 vCPU
- **Timeout**: 300 seconds
- **Max Instances**: 10 (auto-scaling)
- **Min Instances**: 0 (scale to zero)

**To update:**
```bash
gcloud run services update hp-tourism-ecosystem \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2
```

---

## 🧪 Post-Deployment Setup

### 1. Verify Deployment

```bash
# Check service status
gcloud run services describe hp-tourism-ecosystem --region us-central1

# View logs
gcloud run services logs read hp-tourism-ecosystem --region us-central1 --limit 50
```

### 2. Seed Sample Data

1. Visit your deployed URL
2. Open the **Dev Console** (yellow button at bottom-right)
3. Click **"Seed Sample Data"**
4. Wait for confirmation

### 3. Test with Demo Credentials

After seeding, login with:

- **District Officer**: 
  - Mobile: `9876543211`
  - Password: `test123`

- **State Officer**: 
  - Mobile: `9876543212`
  - Password: `test123`

- **Property Owner**: 
  - Mobile: `9876543210`
  - Password: `test123`

---

## 📊 Monitoring & Logs

### View Logs

```bash
# Real-time logs
gcloud run services logs tail hp-tourism-ecosystem --region us-central1

# Recent logs
gcloud run services logs read hp-tourism-ecosystem --region us-central1 --limit 100
```

### Cloud Console Monitoring

Visit: https://console.cloud.google.com/run

- View request metrics
- Monitor errors
- Track latency
- Check resource usage

---

## 💰 Cost Estimation

### Cloud Run Pricing (Pay per use)

**Free Tier (per month):**
- 2 million requests
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

**After Free Tier:**
- Requests: $0.40 per million
- Memory: $0.0000025 per GB-second
- CPU: $0.00001 per vCPU-second

**Example:** 
- 50,000 requests/month
- 512Mi memory, 1 CPU
- **Cost: FREE** (within free tier)

### Database Costs

**Neon (Recommended):**
- Free tier: 0.5GB storage
- Paid plans: From $19/month

**Cloud SQL:**
- db-f1-micro: ~$7-10/month
- db-g1-small: ~$25-35/month

---

## 🛡️ Security Best Practices

### 1. Use Secret Manager (Not Environment Variables)

✅ **DO:**
```bash
echo -n "secret-value" | gcloud secrets create MY_SECRET --data-file=-
gcloud run services update my-service --set-secrets="MY_SECRET=MY_SECRET:latest"
```

❌ **DON'T:**
```bash
gcloud run services update my-service --set-env-vars="MY_SECRET=plaintext-secret"
```

### 2. Restrict Access

```bash
# Remove public access (if needed)
gcloud run services remove-iam-policy-binding hp-tourism-ecosystem \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region us-central1

# Add specific users
gcloud run services add-iam-policy-binding hp-tourism-ecosystem \
  --member="user:admin@example.com" \
  --role="roles/run.invoker" \
  --region us-central1
```

### 3. Enable HTTPS Only

Cloud Run automatically provides HTTPS. Never disable it.

---

## 🔄 Updates & Rollbacks

### Update Deployed Application

```bash
# Option 1: Redeploy from source
gcloud run deploy hp-tourism-ecosystem --source .

# Option 2: Via git push (if CI/CD configured)
git push origin main
```

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service hp-tourism-ecosystem --region us-central1

# Rollback to specific revision
gcloud run services update-traffic hp-tourism-ecosystem \
  --to-revisions=hp-tourism-ecosystem-00002-xyz=100 \
  --region us-central1
```

---

## 🐛 Troubleshooting

### Container Fails to Start

**Check logs:**
```bash
gcloud run services logs read hp-tourism-ecosystem --region us-central1
```

**Common issues:**
- Port mismatch (must use `process.env.PORT`)
- Missing `DATABASE_URL`
- Database connection timeout

### Database Connection Issues

**Verify DATABASE_URL:**
```bash
gcloud secrets versions access latest --secret="DATABASE_URL"
```

**Test connection locally:**
```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

### Build Fails

**Check Cloud Build logs:**
```bash
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

**Common issues:**
- Node version mismatch
- Missing dependencies
- Dockerfile syntax errors

---

## 📚 Additional Resources

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **Secret Manager**: https://cloud.google.com/secret-manager/docs
- **Cloud Build**: https://cloud.google.com/build/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator

---

## 🆘 Support

**GCP Community:**
- Stack Overflow: `google-cloud-run` tag
- GitHub Issues: https://github.com/YOUR_REPO/issues
- GCP Support: https://cloud.google.com/support

---

## 🎉 Success!

Your HP Tourism Digital Ecosystem is now live on GCP!

**Next Steps:**
1. ✅ Configure custom domain (optional)
2. ✅ Set up monitoring alerts
3. ✅ Enable Cloud CDN for static assets
4. ✅ Configure backup strategy
5. ✅ Plan for production data migration

**Demo URL:** `https://hp-tourism-ecosystem-XXXX.run.app`

---

**Made with ❤️ for Himachal Pradesh Tourism**
