# Database Restoration Quick Start Guide

## TL;DR - Just Run This

```bash
cd /home/faiyt/codebase/refactor/discord-bot

# Dry run first (SAFE - no changes made)
bash src/scripts/db-restore/master-restore.sh --dry-run

# When ready, run the actual restoration
bash src/scripts/db-restore/master-restore.sh
```

That's it! The master script will handle everything automatically.

---

## What Will Happen

The script will automatically:

1. ✅ **Backup VPS database** to `./backups/` (safety first!)
2. ✅ **Export local database** to `./backups/`
3. ✅ **Identify duplicate Discord threads** (if VPS_DATABASE_URL is set)
4. ✅ **Delete duplicate threads** (asks for confirmation)
5. ✅ **Restore local database to VPS** (replaces VPS database)
6. ✅ **Restart bot** on VPS
7. ✅ **Verify** everything worked

---

## Before You Start

### 1. Verify SSH Access

```bash
ssh vps "echo 'SSH connection works!'"
```

If this fails, check your `~/.ssh/config` file.

### 2. Verify Local Database is Running

```bash
cd /home/faiyt/codebase/refactor/discord-bot
docker-compose ps db
```

Should show the database container running.

### 3. Verify VPS Bot is Running

```bash
ssh vps "cd ~/discord-bot && docker-compose ps"
```

Should show bot and database containers running.

---

## Running the Restoration

### Step 1: Dry Run (Safe - Preview Only)

```bash
cd /home/faiyt/codebase/refactor/discord-bot
bash src/scripts/db-restore/master-restore.sh --dry-run
```

This will show you what **would** happen without making any changes.

### Step 2: Actual Restoration

```bash
bash src/scripts/db-restore/master-restore.sh
```

Follow the prompts and confirmations.

---

## Important Notes

### About Discord Cleanup

The script will try to delete duplicate Discord forum threads. For this to work, you need to either:

**Option 1: Skip it for now (easiest)**

- Just press Enter when asked about VPS_DATABASE_URL
- You can manually delete duplicate Discord threads later

**Option 2: Set VPS database URL**

```bash
export VPS_DATABASE_URL='postgresql://refactor:password@vps-ip:5432/refactor_bot'
bash src/scripts/db-restore/master-restore.sh
```

**Option 3: Run cleanup manually on VPS later**

```bash
ssh vps 'cd ~/discord-bot && bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run'
ssh vps 'cd ~/discord-bot && bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts'
```

### About Database Credentials

The scripts use the database configuration from your `.env` file. The local database uses:

- Host: `localhost`
- Port: `15432`
- Database: `refactor_bot`

These are configured in Docker Compose and should work automatically.

---

## After Restoration

### 1. Check Bot Logs

```bash
ssh vps 'cd ~/discord-bot && docker-compose logs -f bot'
```

Look for any errors. Press Ctrl+C to exit.

### 2. Test in Discord

Send a test recommendation to verify the bot is working correctly.

### 3. Check for Duplicates

```bash
ssh vps 'cd ~/discord-bot && bun src/scripts/deduplicate.ts --dry-run'
```

If duplicates exist, run:

```bash
ssh vps 'cd ~/discord-bot && bun src/scripts/deduplicate.ts'
```

---

## If Something Goes Wrong

### Bot won't start after restoration

```bash
# Check logs
ssh vps 'cd ~/discord-bot && docker-compose logs bot'

# Restart everything
ssh vps 'cd ~/discord-bot && docker-compose restart'
```

### Database seems corrupted

Restore from the backup that was automatically created:

```bash
# Find the backup file
ls -lh backups/vps_refactor_bot_backup_*.sql

# Restore it (replace TIMESTAMP with actual timestamp)
ssh vps 'cd ~/discord-bot && docker-compose exec -T db psql -U refactor refactor_bot' < backups/vps_refactor_bot_backup_TIMESTAMP.sql
```

### Want to start over

All backups are saved in the `backups/` directory. You can always restore from any backup file.

---

## Manual Step-by-Step (Advanced)

If you prefer to run each phase manually instead of using the master script:

```bash
# Phase 1: Backup VPS
bash src/scripts/db-restore/1-backup-vps-database.sh

# Phase 2: Export Local
bash src/scripts/db-restore/3-export-local-database.sh

# Phase 3: Cleanup Discord (optional, requires VPS_DATABASE_URL)
export VPS_DATABASE_URL='postgresql://user:pass@vps-ip:5432/refactor_bot'
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts --dry-run
bun src/scripts/db-restore/2-cleanup-discord-duplicates.ts

# Phase 4: Restore to VPS
bash src/scripts/db-restore/4-restore-to-vps.sh
```

---

## Getting Help

1. Read the full documentation: `src/scripts/db-restore/README.md`
2. Check script logs for error messages
3. Verify all prerequisites are met
4. Review the troubleshooting section in README.md

---

## Summary

**Easiest way:**

```bash
cd /home/faiyt/codebase/refactor/discord-bot
bash src/scripts/db-restore/master-restore.sh --dry-run  # Preview
bash src/scripts/db-restore/master-restore.sh            # Execute
```

**What you get:**

- ✅ VPS database backed up safely
- ✅ Local database exported
- ✅ Duplicate Discord threads identified (and optionally deleted)
- ✅ Local database restored to VPS
- ✅ Bot restarted and verified
- ✅ Everything working correctly

**Time estimate:** 10-15 minutes including verification

---

Good luck! 🚀
