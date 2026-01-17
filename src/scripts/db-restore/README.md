# Database Restoration Scripts

This directory contains scripts to restore your local Discord bot database to the VPS and clean up duplicate Discord forum threads.

## Problem Background

When the Discord bot was installed on the VPS, it re-indexed Discord messages and created duplicate database entries along with duplicate Discord forum threads. This restoration process will:

1. ✅ Backup the VPS database (safety first)
2. ✅ Export the local database
3. ✅ Identify and delete duplicate Discord forum threads
4. ✅ Restore the local database to VPS
5. ✅ Verify the restoration

## Quick Start

### Option 1: Master Script (Recommended)

Run the master orchestration script that handles everything:

```bash
# Dry run first (safe, no changes)
bash src/scripts/db-restore/master-restore.sh --dry-run

# Actual restoration
bash src/scripts/db-restore/master-restore.sh
```

### Option 2: Step-by-Step Manual Execution

If you prefer to run each phase manually:

```bash
# Phase 1: Backup VPS database
bash src/scripts/db-restore/1-backup-vps-database.sh

# Phase 2: Export local database
bash src/scripts/db-restore/3-export-local-database.sh

# Phase 3: Cleanup duplicate Discord threads (requires VPS_DATABASE_URL)
export VPS_DATABASE_URL='postgresql://user:pass@vps-host:5432/refactor_bot'
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts

# Phase 4: Restore database to VPS
bash src/scripts/db-restore/4-restore-to-vps.sh
```

## Prerequisites

### Required

- SSH access to VPS configured as `ssh vps` in `~/.ssh/config`
- Docker Compose running on both local and VPS
- PostgreSQL database in Docker containers
- Discord bot token in `.env` file
- Bun runtime installed (`npm install -g bun` or `brew install bun`)

### Environment Variables

For the Discord cleanup script to work, you need:

```bash
# Option 1: Run the script ON the VPS (automatically uses VPS database)
ssh vps 'cd ~/discord-bot && bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts'

# Option 2: Set VPS_DATABASE_URL locally
export VPS_DATABASE_URL='postgresql://refactor:password@vps-ip:5432/refactor_bot'
```

## Script Details

### 1. `1-backup-vps-database.sh`

**Purpose:** Creates a backup of the VPS database before any changes.

**What it does:**

- Connects to VPS via SSH
- Creates a PostgreSQL dump using `pg_dump`
- Saves to `./backups/vps_refactor_bot_backup_YYYYMMDD_HHMMSS.sql`
- Reports file size and line count

**Usage:**

```bash
bash src/scripts/db-restore/1-backup-vps-database.sh
```

**Output:**

- Backup file in `backups/` directory
- Verification statistics (size, lines)

### 2. `2-cleanup-discord-duplicates.ts`

**Purpose:** Identifies and deletes duplicate Discord forum threads created during VPS re-indexing.

**What it does:**

- Loads all `forumThreadId` values from local database
- Queries VPS database for threads NOT in local database
- Deletes those duplicate threads via Discord API
- Supports dry-run mode to preview deletions

**Usage:**

```bash
# Preview what will be deleted
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run

# Actually delete duplicates
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts
```

**Requirements:**

- `VPS_DATABASE_URL` environment variable OR run on VPS
- `DISCORD_BOT_TOKEN` in `.env`

**Safety Features:**

- Dry-run mode available
- 1-second rate limiting between deletions
- Detailed logging of all actions
- Error handling for missing threads

### 3. `3-export-local-database.sh`

**Purpose:** Exports the local PostgreSQL database to a SQL dump file.

**What it does:**

- Connects to local PostgreSQL (via Docker Compose or direct)
- Creates a complete database dump
- Saves to `./backups/local_refactor_bot_export_YYYYMMDD_HHMMSS.sql`
- Creates symlink `./backups/local_latest.sql` for easy reference

**Usage:**

```bash
bash src/scripts/db-restore/3-export-local-database.sh
```

**Configuration:**

- Database connection details read from `.env` file
- Uses Docker Compose if `docker-compose.yml` exists
- Falls back to direct `pg_dump` otherwise

### 4. `4-restore-to-vps.sh`

**Purpose:** Restores the local database export to the VPS, replacing the VPS database.

**What it does:**

1. Transfers local export file to VPS via SCP
2. Stops the Discord bot on VPS
3. Drops and recreates the VPS database
4. Restores from the local export
5. Restarts the Discord bot
6. Verifies restoration with statistics

**Usage:**

```bash
# Use latest export (default)
bash src/scripts/db-restore/4-restore-to-vps.sh

# Use specific export file
bash src/scripts/db-restore/4-restore-to-vps.sh local_refactor_bot_export_20260117_123456.sql
```

**Safety Features:**

- Interactive confirmation before proceeding
- File validation before transfer
- Error handling at each step
- Automatic bot restart even if restoration fails
- Verification statistics after completion

### 5. `master-restore.sh`

**Purpose:** Orchestrates the entire restoration process in the correct order.

**What it does:**

- Runs all scripts in sequence
- Handles errors gracefully
- Provides progress updates
- Supports dry-run mode
- Performs final verification

**Usage:**

```bash
# Dry run (safe, no changes)
bash src/scripts/db-restore/master-restore.sh --dry-run

# Full restoration
bash src/scripts/db-restore/master-restore.sh
```

## Directory Structure

```
src/scripts/db-restore/
├── 1-backup-vps-database.sh         # VPS backup
├── 2-cleanup-discord-duplicates.ts  # Discord thread cleanup
├── 3-export-local-database.sh       # Local DB export
├── 4-restore-to-vps.sh              # VPS DB restoration
├── master-restore.sh                # Master orchestration script
└── README.md                        # This file

backups/                             # Created automatically
├── vps_refactor_bot_backup_*.sql   # VPS backups
├── local_refactor_bot_export_*.sql # Local exports
└── local_latest.sql                # Symlink to latest export
```

## Safety Features

All scripts include:

- ✅ **Error handling**: `set -e` to exit on errors
- ✅ **Validation**: File existence checks before operations
- ✅ **Backups**: VPS database backed up before changes
- ✅ **Dry-run mode**: Preview changes without making them
- ✅ **Confirmation prompts**: Interactive confirmations for destructive operations
- ✅ **Verification**: Post-operation statistics and checks
- ✅ **Detailed logging**: Progress updates at each step

## Troubleshooting

### Problem: SSH connection fails

**Solution:**
Check your `~/.ssh/config` file has VPS configuration:

```
Host vps
    HostName your-vps-ip
    User your-username
    IdentityFile ~/.ssh/id_rsa
```

### Problem: Docker Compose not found

**Solution:**
Ensure Docker Compose is installed and running:

```bash
# Local
docker-compose ps

# VPS
ssh vps 'docker-compose ps'
```

### Problem: Database connection fails

**Solution:**

1. Check `.env` file has correct `DATABASE_URL`
2. Ensure PostgreSQL container is running
3. Verify database credentials

### Problem: Discord API rate limiting

**Solution:**
The cleanup script includes 1-second delays between deletions. If you still hit rate limits, the script will log errors but continue with other threads.

### Problem: VPS_DATABASE_URL not set

**Solution:**

**Option 1:** Run cleanup script ON the VPS:

```bash
ssh vps 'cd ~/discord-bot && bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run'
```

**Option 2:** Set VPS database URL locally:

```bash
export VPS_DATABASE_URL='postgresql://refactor:password@vps-ip:5432/refactor_bot'
```

### Problem: Duplicate URLs still exist after restoration

**Solution:**
Run the existing deduplication script:

```bash
ssh vps 'cd ~/discord-bot && bun src/scripts/deduplicate.ts --dry-run'
ssh vps 'cd ~/discord-bot && bun src/scripts/deduplicate.ts'
```

## Verification Checklist

After running the restoration:

- [ ] VPS database backup exists in `backups/` directory
- [ ] Local database export completed successfully
- [ ] Discord duplicate threads deleted (if applicable)
- [ ] VPS database restored without errors
- [ ] Bot restarted on VPS
- [ ] Database statistics look correct (run verification)
- [ ] No duplicate URLs in database (or acceptable number)
- [ ] Bot responds to Discord commands
- [ ] Test recommendation works correctly

### Manual Verification Commands

```bash
# Check bot status on VPS
ssh vps 'cd ~/discord-bot && docker-compose ps'

# View bot logs
ssh vps 'cd ~/discord-bot && docker-compose logs -f bot'

# Check database statistics
ssh vps 'cd ~/discord-bot && docker-compose exec db psql -U refactor refactor_bot -c "SELECT COUNT(*) FROM \"Recommendation\";"'

# Check for duplicates
ssh vps 'cd ~/discord-bot && docker-compose exec db psql -U refactor refactor_bot -c "SELECT url, COUNT(*) FROM \"Recommendation\" GROUP BY url HAVING COUNT(*) > 1;"'
```

## Recovery Procedures

### If restoration fails midway:

1. **Database is corrupted:**

   ```bash
   # Restore from VPS backup
   ssh vps 'cd ~/discord-bot && cat backups/vps_refactor_bot_backup_*.sql | docker-compose exec -T db psql -U refactor refactor_bot'
   ```

2. **Bot won't start:**

   ```bash
   # Check logs for errors
   ssh vps 'cd ~/discord-bot && docker-compose logs bot'

   # Restart bot
   ssh vps 'cd ~/discord-bot && docker-compose restart bot'
   ```

3. **Database connection issues:**

   ```bash
   # Verify database is running
   ssh vps 'cd ~/discord-bot && docker-compose ps db'

   # Restart database
   ssh vps 'cd ~/discord-bot && docker-compose restart db'
   ```

## Best Practices

1. **Always run dry-run first** before executing destructive operations
2. **Keep backups** - don't delete backup files immediately
3. **Monitor bot logs** for at least an hour after restoration
4. **Test thoroughly** - send test recommendations to verify functionality
5. **Document issues** - keep notes of any problems encountered

## Related Scripts

- `src/scripts/deduplicate.ts` - Remove duplicate URLs from database
- `src/scripts/bulk-import.ts` - Import recommendations with duplicate checking
- `src/scripts/cleanup-404-podcasts.ts` - Remove invalid URLs

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review bot logs for error messages
3. Verify all prerequisites are met
4. Ensure environment variables are set correctly

## License

Part of the Discord Refactor Bot project.
