# HP Tourism Portal - GCP VM Deployment Guide

## Overview

This guide provides complete instructions for deploying the HP Tourism Digital Ecosystem on a Google Cloud Platform (GCP) Virtual Machine for demo purposes.

## Prerequisites

- GCP account with billing enabled
- Basic knowledge of Linux/Ubuntu commands
- Domain name (optional, for production deployment)

## Step 1: Export Data from Replit

### 1.1 Export Database

Run the database export script:

```bash
chmod +x scripts/export-database.sh
./scripts/export-database.sh
```

This creates a timestamped SQL dump file in the `backups/` directory (e.g., `backups/hp-tourism-db-20251102_150000.sql`).

### 1.2 Download the Database Backup

Download the generated `.sql` file from the `backups/` directory to your local machine.

### 1.3 Export Environment Variables

Create a file called `production.env` with all required environment variables (see Step 4 for complete list).

### 1.4 Download the Codebase

Option A: **Clone from Git** (if you've pushed to GitHub/GitLab)
```bash
git clone <your-repository-url>
cd hp-tourism-portal
```

Option B: **Download from Replit**
- Download the entire project as a ZIP file from Replit
- Extract on your local machine

## Step 2: Create GCP VM Instance

### 2.1 Create VM via GCP Console

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **Compute Engine > VM Instances**
3. Click **Create Instance**

### 2.2 Recommended VM Configuration

```yaml
Name: hp-tourism-demo
Region: asia-south1 (Mumbai) # or your preferred region
Zone: asia-south1-a
Machine type: e2-medium (2 vCPU, 4 GB memory)
Boot disk: Ubuntu 22.04 LTS (20 GB)
Firewall: ✅ Allow HTTP traffic
         ✅ Allow HTTPS traffic
```

### 2.3 Configure Firewall Rules

After VM creation, add firewall rule for Node.js app:

```bash
# In GCP Console: VPC Network > Firewall
Name: allow-nodejs-5000
Targets: All instances in the network
Source IP ranges: 0.0.0.0/0
Protocols and ports: tcp:5000
```

## Step 3: Set Up VM Environment

### 3.1 Connect to VM

```bash
# Via GCP Console SSH button, or:
gcloud compute ssh hp-tourism-demo --zone=asia-south1-a
```

### 3.2 Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client tools
sudo apt install -y postgresql-client

# Install Git
sudo apt install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Verify installations
node --version  # Should show v20.x
npm --version
psql --version
```

## Step 4: Set Up PostgreSQL Database

### 4.1 Option A: Use Neon PostgreSQL (Recommended)

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: "HP Tourism Demo"
3. Create a database: "hp_tourism"
4. Copy the connection string (DATABASE_URL)

### 4.2 Option B: Install PostgreSQL on VM

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE hp_tourism;
CREATE USER hp_tourism_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hp_tourism TO hp_tourism_user;
\q
EOF

# Your DATABASE_URL will be:
# postgresql://hp_tourism_user:your_secure_password@localhost:5432/hp_tourism
```

### 4.3 Import Database

```bash
# Upload the SQL backup file to VM (use gcloud or scp)
gcloud compute scp backups/hp-tourism-db-*.sql hp-tourism-demo:~/

# Import the database
psql $DATABASE_URL < hp-tourism-db-*.sql
```

## Step 5: Deploy Application

### 5.1 Upload Code to VM

```bash
# Option A: Clone from Git
git clone <your-repository-url>
cd hp-tourism-portal

# Option B: Upload via gcloud
gcloud compute scp --recurse ./hp-tourism-portal hp-tourism-demo:~/
```

### 5.2 Install Dependencies

```bash
cd ~/hp-tourism-portal
npm install
```

### 5.3 Configure Environment Variables

Create `.env` file in the project root:

```bash
nano .env
```

Add the following (replace with your actual values):

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/hp_tourism
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=hp_tourism

# Session Configuration
SESSION_SECRET=generate-a-long-random-string-min-32-chars

# HimKosh Payment Gateway Configuration
HIMKOSH_MERCHANT_CODE=your_merchant_code
HIMKOSH_DEPT_ID=your_dept_id
HIMKOSH_SERVICE_CODE=your_service_code
HIMKOSH_DDO=your_ddo_code
HIMKOSH_HEAD=your_head_code
HIMKOSH_POST_URL=https://egov.hp.nic.in/himkosh/CTP/default.aspx
HIMKOSH_RETURN_URL=http://your-vm-ip:5000/api/himkosh/callback
HIMKOSH_VERIFY_URL=https://egov.hp.nic.in/himkosh/CTP/DoubleVerification.aspx

# Object Storage (if using Replit's - optional for demo)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your_bucket_id
PUBLIC_OBJECT_SEARCH_PATHS=your_paths
PRIVATE_OBJECT_DIR=your_private_dir

# Application Configuration
NODE_ENV=production
PORT=5000
```

**Important:** Generate a secure SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.4 Build the Application

```bash
npm run build
```

### 5.5 Start with PM2

```bash
# Start the application
pm2 start npm --name "hp-tourism" -- run start

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the instructions displayed by the command above

# Check status
pm2 status
pm2 logs hp-tourism
```

## Step 6: Configure Domain (Optional)

### 6.1 Point Domain to VM IP

1. Get your VM's external IP:
   ```bash
   gcloud compute instances describe hp-tourism-demo --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
   ```

2. Add DNS A record:
   ```
   A    @              VM_EXTERNAL_IP
   A    www            VM_EXTERNAL_IP
   ```

### 6.2 Install Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/hp-tourism
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hp-tourism /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6.3 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
```

## Step 7: Access the Application

### Without Domain:
```
http://YOUR_VM_EXTERNAL_IP:5000
```

### With Nginx Proxy:
```
http://your-domain.com
```

### With SSL:
```
https://your-domain.com
```

## Step 8: Login with Default Accounts

Use these credentials to access the system:

| Role | Mobile | Password | Access |
|------|--------|----------|--------|
| Admin | 9999999999 | admin123 | Full admin access |
| Super Admin | 9999999998 | SuperAdmin@2025 | System maintenance |
| Dealing Assistant | 9876543210 | da123 | Shimla district (testing) |

**⚠️ IMPORTANT:** Change these passwords immediately after first login!

## Step 9: Verify Deployment

1. **Check Application Status**
   ```bash
   pm2 status
   pm2 logs hp-tourism --lines 100
   ```

2. **Check Database Connection**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

3. **Test Web Access**
   - Open browser to your VM IP or domain
   - Login with admin credentials
   - Verify all features work

## Maintenance Commands

```bash
# View logs
pm2 logs hp-tourism

# Restart application
pm2 restart hp-tourism

# Stop application
pm2 stop hp-tourism

# Monitor resources
pm2 monit

# Update application
cd ~/hp-tourism-portal
git pull  # or upload new files
npm install
npm run build
pm2 restart hp-tourism
```

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs hp-tourism --lines 100

# Check environment variables
pm2 env 0

# Restart with fresh logs
pm2 delete hp-tourism
pm2 start npm --name "hp-tourism" -- run start
```

### Database connection errors
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Check if PostgreSQL is running
sudo systemctl status postgresql
```

### Port 5000 not accessible
```bash
# Check if app is running
pm2 status

# Check firewall rules
sudo ufw status

# Check if port is listening
sudo netstat -tulpn | grep 5000
```

### Out of memory
```bash
# Increase VM memory in GCP Console
# Or add swap space:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Security Checklist for Demo

- [ ] Change all default passwords
- [ ] Enable firewall (ufw)
- [ ] Keep system updated (`sudo apt update && sudo apt upgrade`)
- [ ] Use HTTPS with SSL certificate
- [ ] Restrict database access (only localhost if DB on same VM)
- [ ] Set strong SESSION_SECRET
- [ ] Review and restrict GCP firewall rules
- [ ] Enable automatic backups in GCP
- [ ] Monitor logs regularly

## Backup Strategy for GCP

### Automated Database Backups

Create a cron job for daily backups:

```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/hp-tourism-${TIMESTAMP}.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "hp-tourism-*.sql.gz" -mtime +7 -delete
EOF

chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * ~/backup-db.sh
```

## Cost Estimation (GCP)

**Monthly costs for demo setup:**
- VM (e2-medium): ~$25/month
- Neon PostgreSQL (Free tier): $0 (up to 10GB)
- Static IP: ~$7/month (if reserved)
- Egress traffic: Variable (~$0.12/GB)

**Estimated total: ~$30-40/month**

## Support and Documentation

- Application documentation: See `docs/` folder
- HimKosh integration: See `docs/HIMKOSH_INTEGRATION.md`
- Database schema: See `shared/schema.ts`
- API routes: See `server/routes.ts`

---

**Questions or issues?** Check the logs first with `pm2 logs hp-tourism`
