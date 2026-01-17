#!/bin/bash

# VPS Database Backup Script
# This script backs up the VPS database before restoration

set -e  # Exit on any error

echo "=========================================="
echo "VPS Database Backup Script"
echo "=========================================="
echo ""

# Configuration
VPS_HOST="vps"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="vps_refactor_bot_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up VPS database..."
echo "Backup file: $BACKUP_DIR/$BACKUP_FILE"
echo ""

# SSH to VPS and create database dump
# Note: Adjust the docker exec command based on your actual container name
ssh "$VPS_HOST" "cd /opt/config/discord-bot && docker compose exec -T postgres pg_dump -U refactor refactor_bot" > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "✅ VPS database backup completed successfully!"
    echo "📁 Backup location: $BACKUP_DIR/$BACKUP_FILE"

    # Get file size
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "📊 Backup size: $SIZE"

    # Count number of lines (rough indicator of data)
    LINES=$(wc -l < "$BACKUP_DIR/$BACKUP_FILE")
    echo "📄 Lines in backup: $LINES"
else
    echo "❌ ERROR: Backup file is empty or was not created!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Backup Complete!"
echo "=========================================="
