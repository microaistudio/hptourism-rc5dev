#!/bin/bash

# HP Tourism Portal - Deployment Preparation Script
# Prepares all necessary files for GCP VM deployment

set -e

echo "🚀 HP Tourism Portal - Deployment Preparation"
echo "=============================================="
echo ""

# Create deployment package directory
DEPLOY_DIR="deployment-package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "📦 Step 1: Exporting database..."
echo "--------------------------------"

# Export database
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set. Skipping database export."
    echo "   Please export manually using: pg_dump \$DATABASE_URL > backup.sql"
else
    mkdir -p backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/hp-tourism-db-${TIMESTAMP}.sql"
    
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Database exported: ${BACKUP_FILE}"
        cp "$BACKUP_FILE" "$DEPLOY_DIR/"
    else
        echo "❌ Database export failed!"
        exit 1
    fi
fi

echo ""
echo "📋 Step 2: Creating environment template..."
echo "-------------------------------------------"

# Create environment template
cat > "$DEPLOY_DIR/production.env.template" << 'EOF'
# HP Tourism Portal - Production Environment Configuration
# Copy this file to .env and fill in your actual values

# ===================================
# Database Configuration
# ===================================
DATABASE_URL=postgresql://user:password@host:5432/hp_tourism
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=hp_tourism

# ===================================
# Session Configuration
# ===================================
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=GENERATE_A_SECURE_RANDOM_STRING_MIN_32_CHARS

# ===================================
# HimKosh Payment Gateway
# ===================================
HIMKOSH_MERCHANT_CODE=your_merchant_code
HIMKOSH_DEPT_ID=your_dept_id
HIMKOSH_SERVICE_CODE=your_service_code
HIMKOSH_DDO=your_ddo_code
HIMKOSH_HEAD=your_head_code
HIMKOSH_POST_URL=https://egov.hp.nic.in/himkosh/CTP/default.aspx
HIMKOSH_RETURN_URL=http://your-server-url/api/himkosh/callback
HIMKOSH_VERIFY_URL=https://egov.hp.nic.in/himkosh/CTP/DoubleVerification.aspx

# ===================================
# Object Storage (Optional for demo)
# ===================================
# DEFAULT_OBJECT_STORAGE_BUCKET_ID=your_bucket_id
# PUBLIC_OBJECT_SEARCH_PATHS=your_paths
# PRIVATE_OBJECT_DIR=your_private_dir

# ===================================
# Application Configuration
# ===================================
NODE_ENV=production
PORT=5000

# ===================================
# Default Credentials (CHANGE THESE!)
# ===================================
# Admin: 9999999999 / admin123
# Super Admin: 9999999998 / SuperAdmin@2025
# DA (Shimla): 9876543210 / da123
EOF

echo "✅ Environment template created: $DEPLOY_DIR/production.env.template"

echo ""
echo "📄 Step 3: Copying deployment files..."
echo "---------------------------------------"

# Copy deployment guide
cp GCP_DEPLOYMENT.md "$DEPLOY_DIR/"
echo "✅ Copied: GCP_DEPLOYMENT.md"

# Copy HimKosh key if it exists
if [ -f "server/himkosh/echallan.key" ]; then
    mkdir -p "$DEPLOY_DIR/himkosh"
    cp server/himkosh/echallan.key "$DEPLOY_DIR/himkosh/"
    echo "✅ Copied: HimKosh encryption key"
else
    echo "⚠️  WARNING: server/himkosh/echallan.key not found"
    echo "   You'll need to obtain this from HP Government CTP team"
fi

echo ""
echo "📊 Step 4: Creating deployment checklist..."
echo "--------------------------------------------"

cat > "$DEPLOY_DIR/DEPLOYMENT_CHECKLIST.md" << 'EOF'
# HP Tourism Portal - Deployment Checklist

## Pre-Deployment

- [ ] Database backup completed
- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] HimKosh echallan.key obtained from CTP team
- [ ] GCP account created and billing enabled
- [ ] Domain name configured (if applicable)

## GCP VM Setup

- [ ] VM instance created (recommended: e2-medium, Ubuntu 22.04)
- [ ] Firewall rules configured (HTTP, HTTPS, port 5000)
- [ ] SSH access verified
- [ ] Node.js 20.x installed
- [ ] PostgreSQL client tools installed
- [ ] PM2 installed globally

## Database Setup

- [ ] PostgreSQL database created (Neon or local)
- [ ] Database connection string obtained
- [ ] Database backup imported successfully
- [ ] Database connection tested

## Application Deployment

- [ ] Code uploaded to VM
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (.env file)
- [ ] Application built (`npm run build`)
- [ ] Application started with PM2
- [ ] PM2 configured to start on boot

## Post-Deployment

- [ ] Web interface accessible
- [ ] Login with admin credentials successful
- [ ] All major features tested
- [ ] Default passwords changed
- [ ] SSL certificate installed (if using domain)
- [ ] Nginx reverse proxy configured (optional)
- [ ] Backup cron job configured
- [ ] Monitoring set up

## Security

- [ ] All default passwords changed
- [ ] SESSION_SECRET is strong and unique
- [ ] Firewall enabled and configured
- [ ] Database access restricted
- [ ] HTTPS enabled (production)
- [ ] System updates applied

## Testing

- [ ] User registration works
- [ ] Application submission works
- [ ] Admin dashboard accessible
- [ ] DA workflow functional
- [ ] DTDO workflow functional
- [ ] Payment gateway integration tested (HimKosh)
- [ ] Document upload/download works
- [ ] Reports generation works

## Documentation

- [ ] Deployment documented
- [ ] Admin credentials shared securely
- [ ] Backup procedure documented
- [ ] Troubleshooting guide reviewed
EOF

echo "✅ Deployment checklist created"

echo ""
echo "📦 Step 5: Creating package archive..."
echo "---------------------------------------"

# Create archive
ARCHIVE_NAME="hp-tourism-deployment-${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE_NAME" "$DEPLOY_DIR"

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    echo "✅ Deployment package created: $ARCHIVE_NAME (${ARCHIVE_SIZE})"
else
    echo "❌ Failed to create archive"
    exit 1
fi

echo ""
echo "✨ Deployment Preparation Complete!"
echo "===================================="
echo ""
echo "📦 Deployment Package Contents:"
echo "   - Database backup (SQL)"
echo "   - Environment template"
echo "   - GCP deployment guide"
echo "   - Deployment checklist"
echo "   - HimKosh encryption key (if available)"
echo ""
echo "📋 Next Steps:"
echo "   1. Download: $ARCHIVE_NAME"
echo "   2. Extract on your local machine"
echo "   3. Follow: $DEPLOY_DIR/GCP_DEPLOYMENT.md"
echo "   4. Use checklist: $DEPLOY_DIR/DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🚀 For code deployment to GCP VM:"
echo "   Option A: Push code to Git and clone on VM"
echo "   Option B: Use 'gcloud compute scp' to upload entire project"
echo ""
echo "📞 Need help? Check the deployment guide for detailed instructions."
echo ""
