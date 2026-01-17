#!/bin/bash

# Master Database Restoration Script
# This script orchestrates the entire database restoration process

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     Discord Bot Database Restoration Master Script        ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will:"
echo "  1. ✅ Backup VPS database (safety first!)"
echo "  2. ✅ Export local database"
echo "  3. ✅ Identify duplicate Discord forum threads"
echo "  4. ✅ Delete duplicate Discord threads (requires confirmation)"
echo "  5. ✅ Restore local database to VPS"
echo "  6. ✅ Verify restoration"
echo ""
echo "⚠️  WARNING: This will replace the VPS database with local data!"
echo ""

# Check if running in dry-run mode
DRY_RUN=""
if [ "$1" == "--dry-run" ]; then
    DRY_RUN="--dry-run"
    echo "🔍 Running in DRY RUN mode - no destructive changes will be made"
    echo ""
fi

# Confirmation
if [ -z "$DRY_RUN" ]; then
    read -p "Do you want to continue with the full restoration? (yes/no): " -r CONFIRMATION
    if [ "$CONFIRMATION" != "yes" ]; then
        echo "❌ Restoration cancelled by user"
        exit 0
    fi
    echo ""
fi

# Create backups directory
mkdir -p backups

echo "════════════════════════════════════════════════════════════"
echo "Phase 1: Backup VPS Database"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ -z "$DRY_RUN" ]; then
    bash "$SCRIPT_DIR/1-backup-vps-database.sh"
else
    echo "🔍 DRY RUN: Would backup VPS database"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Phase 2: Export Local Database"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ -z "$DRY_RUN" ]; then
    bash "$SCRIPT_DIR/3-export-local-database.sh"
else
    echo "🔍 DRY RUN: Would export local database"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Phase 3: Identify Duplicate Discord Threads"
echo "════════════════════════════════════════════════════════════"
echo ""

# This requires VPS_DATABASE_URL to be set
if [ -z "$VPS_DATABASE_URL" ]; then
    echo "⚠️  WARNING: VPS_DATABASE_URL not set!"
    echo ""
    echo "To identify duplicates, you need to either:"
    echo "  1. Run this script ON the VPS, OR"
    echo "  2. Set VPS_DATABASE_URL environment variable"
    echo ""
    echo "Example:"
    echo "  export VPS_DATABASE_URL='postgresql://user:pass@vps-host:5432/refactor_bot'"
    echo ""
    read -p "Do you want to skip duplicate detection for now? (yes/no): " -r SKIP_DUPES

    if [ "$SKIP_DUPES" != "yes" ]; then
        echo "❌ Cancelled by user"
        exit 0
    fi

    echo ""
    echo "⏭️  Skipping duplicate detection (you can run it manually later)"
else
    echo "Running duplicate detection script..."
    bun "$SCRIPT_DIR/2-cleanup-discord-duplicates.ts" $DRY_RUN
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Phase 4: Restore Database to VPS"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ -z "$DRY_RUN" ]; then
    bash "$SCRIPT_DIR/4-restore-to-vps.sh"
else
    echo "🔍 DRY RUN: Would restore database to VPS"
    echo "  - Stop bot"
    echo "  - Drop and recreate database"
    echo "  - Restore from local export"
    echo "  - Restart bot"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Phase 5: Final Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ -z "$DRY_RUN" ]; then
    echo "Running verification checks..."
    echo ""

    ssh vps << 'ENDSSH'
cd /opt/config/discord-bot

echo "📊 Final Database Statistics:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Total recommendations
TOTAL=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\";")
echo "Total Recommendations: $TOTAL"

# By library type
FICTION=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\" WHERE \"libraryType\" = 'fiction';")
ATHENAEUM=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\" WHERE \"libraryType\" = 'athenaeum';")
GROWTH=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\" WHERE \"libraryType\" = 'growth';")

echo "  Fiction Vault: $FICTION"
echo "  Athenaeum: $ATHENAEUM"
echo "  Growth Lab: $GROWTH"

# With forum threads
WITH_THREADS=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\" WHERE \"forumThreadId\" IS NOT NULL;")
echo "With Forum Threads: $WITH_THREADS"

# Check for duplicates by URL
DUPES=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM (SELECT url, COUNT(*) as cnt FROM \"Recommendation\" GROUP BY url HAVING COUNT(*) > 1) as dupes;")
echo "Duplicate URLs: $DUPES"

if [ "$DUPES" -gt 0 ]; then
    echo ""
    echo "⚠️  WARNING: Found $DUPES duplicate URLs!"
    echo "Run the deduplication script:"
    echo "  cd /opt/config/discord-bot && bun src/scripts/deduplicate.ts --dry-run"
fi

echo ""
echo "🤖 Bot Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps bot

echo ""
echo "📝 Recent Bot Logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose logs --tail=20 bot

ENDSSH
else
    echo "🔍 DRY RUN: Would verify:"
    echo "  - Database record counts"
    echo "  - Check for duplicate URLs"
    echo "  - Bot status"
    echo "  - Recent logs"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              ✅  RESTORATION COMPLETE!                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$DRY_RUN" ]; then
    echo "📋 Summary of actions taken:"
    echo "  ✅ VPS database backed up to: backups/vps_refactor_bot_backup_*.sql"
    echo "  ✅ Local database exported to: backups/local_refactor_bot_export_*.sql"
    echo "  ✅ Database restored to VPS"
    echo "  ✅ Bot restarted on VPS"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Test bot in Discord - send a test recommendation"
    echo "  2. Check bot logs: ssh vps 'cd /opt/config/discord-bot && docker compose logs -f bot'"
    echo "  3. If duplicate URLs exist, run: ssh vps 'cd /opt/config/discord-bot && bun src/scripts/deduplicate.ts'"
    echo "  4. Monitor bot behavior for the next hour"
else
    echo "🔍 This was a DRY RUN - no actual changes were made"
    echo ""
    echo "To execute the restoration, run:"
    echo "  bash $SCRIPT_DIR/master-restore.sh"
fi

echo ""
