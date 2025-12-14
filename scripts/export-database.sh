#!/bin/bash

# HP Tourism Database Export Script
# Exports PostgreSQL database to SQL file for deployment to GCP VM

set -e

echo "🗄️  HP Tourism Database Export Tool"
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/hp-tourism-db-${TIMESTAMP}.sql"

echo "📦 Exporting database to: ${BACKUP_FILE}"
echo ""

# Export the database
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database exported successfully!"
    echo ""
    echo "📊 Export Statistics:"
    echo "   File: ${BACKUP_FILE}"
    echo "   Size: $(du -h ${BACKUP_FILE} | cut -f1)"
    echo ""
    echo "📋 To restore on GCP VM:"
    echo "   psql \$DATABASE_URL < ${BACKUP_FILE}"
    echo ""
else
    echo "❌ Database export failed!"
    exit 1
fi
