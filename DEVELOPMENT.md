# Development Guide

Complete guide for developing the Refactor Discord Bot with hot reloading and Docker.

## Quick Start for Developers

```bash
# 1. Set up environment
cp .env.docker .env
# Edit .env with your tokens and channel IDs

# 2. Start development environment
bun run docker:dev:bg

# 3. Make code changes - they apply instantly!
# 4. View logs
bun run docker:dev:logs

# 5. Stop when done
bun run docker:dev:down
```

## Development Architecture

### Docker Files

**Production:**
- `Dockerfile` - Multi-stage production build
- `docker-compose.yml` - Production configuration

**Development:**
- `Dockerfile.dev` - Development build with all dev dependencies
- `docker-compose.override.yml` - Development overrides (auto-applied)

### How docker-compose.override.yml Works

Docker Compose automatically merges `docker-compose.yml` and `docker-compose.override.yml`:

```bash
# This command automatically uses BOTH files:
docker-compose up

# Equivalent to:
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

**What gets overridden for development:**
- Uses `Dockerfile.dev` instead of `Dockerfile`
- Mounts source code as volumes for hot reload
- Sets `NODE_ENV=development` and `LOG_LEVEL=debug`
- Removes automatic restart policy
- Uses `bun --watch` command

### Volume Mounts for Hot Reloading

These directories are mounted from your local machine:

```yaml
volumes:
  - ./src:/app/src                      # Application code
  - ./prisma:/app/prisma                # Database schema
  - ./tsconfig.json:/app/tsconfig.json  # TypeScript config
  - ./bunfig.toml:/app/bunfig.toml      # Bun config
  - /app/node_modules                   # Exclude - use container's version
```

**How it works:**
1. You edit `src/index.ts` on your local machine
2. Change is immediately reflected in the container (volume mount)
3. Bun's `--watch` flag detects the change
4. Bot automatically restarts with your changes
5. No rebuild needed! ⚡

## Development Workflow

### Starting Development

```bash
# Option 1: Foreground (see logs immediately)
bun run docker:dev

# Option 2: Background (run in background)
bun run docker:dev:bg
```

### Making Changes

1. **Edit any file** in `src/`, `prisma/`, or config files
2. **Bun automatically detects** the change
3. **Bot restarts** with your changes (usually < 1 second)
4. **Check logs** to see your changes in action

Example:
```bash
# Start in background
bun run docker:dev:bg

# Edit src/index.ts - add a console.log
code src/index.ts

# View logs to see your change
bun run docker:dev:logs
# Output: You'll see your new log message!
```

### Viewing Logs

```bash
# Follow bot logs
bun run docker:dev:logs

# View specific service
docker-compose logs -f bot
docker-compose logs -f postgres

# View all logs
docker-compose logs -f
```

### Database Changes

If you modify the Prisma schema:

```bash
# 1. Edit prisma/schema.prisma
# 2. Push changes to database
docker-compose exec bot bunx prisma db push

# 3. View database in Prisma Studio
docker-compose exec bot bunx prisma studio
# Opens at http://localhost:5555
```

### Stopping Development

```bash
# Stop all containers
bun run docker:dev:down

# Or stop specific service
docker-compose stop bot
docker-compose stop postgres
```

### Full Rebuild

If you change `package.json`, `Dockerfile.dev`, or need a clean slate:

```bash
# Nuclear option - full rebuild
bun run docker:dev:rebuild

# This will:
# 1. Stop all containers
# 2. Remove all cached layers
# 3. Rebuild from scratch
# 4. Start fresh
```

## Common Development Tasks

### Adding Dependencies

```bash
# 1. Add to package.json locally
bun add new-package

# 2. Rebuild containers to install
bun run docker:dev:rebuild
```

### Environment Variables

Edit `.env` file - changes apply on next restart:

```bash
# 1. Edit .env
code .env

# 2. Restart containers
docker-compose restart bot
```

### Debugging

#### Enable More Verbose Logging

Already set to `LOG_LEVEL=debug` in development!

#### Access Container Shell

```bash
# Open bash in running container
docker-compose exec bot bash

# Run commands inside container
docker-compose exec bot bun --version
docker-compose exec bot bunx prisma studio
```

#### Check Container Status

```bash
# View running containers
docker-compose ps

# Check container health
docker-compose ps postgres
# Should show "healthy"
```

### Database Management

```bash
# View database in Prisma Studio
docker-compose exec bot bunx prisma studio

# Generate Prisma client (if schema changes)
docker-compose exec bot bunx prisma generate

# Push schema changes
docker-compose exec bot bunx prisma db push

# Reset database (WARNING: deletes all data)
docker-compose down
docker volume rm discord-bot_postgres_data
docker-compose up -d
```

## Development vs Production

### Key Differences

| Feature | Development | Production |
|---------|------------|-----------|
| **Dockerfile** | `Dockerfile.dev` | `Dockerfile` |
| **Build Stages** | Single stage | Multi-stage (optimized) |
| **Dependencies** | All (including dev) | Production only |
| **Hot Reload** | ✅ Yes (volume mounts) | ❌ No |
| **Logging** | `LOG_LEVEL=debug` | `LOG_LEVEL=info` |
| **Restart Policy** | `no` | `unless-stopped` |
| **Source Code** | Mounted volumes | Copied into image |
| **Command** | `bun --watch src/index.ts` | `./docker-entrypoint.sh` |

### Testing Production Build Locally

```bash
# Use production config explicitly
bun run docker:prod

# This uses only docker-compose.yml (no override)
```

## Troubleshooting Development

### Hot Reload Not Working

**Check volumes are mounted:**
```bash
docker-compose exec bot ls -la /app/src
# Should show your files with recent timestamps
```

**Check Bun watch is running:**
```bash
docker-compose logs bot | grep watch
# Should see "bun --watch src/index.ts"
```

### Changes Not Reflected

**Force restart:**
```bash
docker-compose restart bot
```

**Check file permissions:**
```bash
ls -la src/
# Files should be readable
```

### Database Connection Issues

**Check PostgreSQL is healthy:**
```bash
docker-compose ps postgres
# Status should be "Up" and "healthy"
```

**Restart database:**
```bash
docker-compose restart postgres
```

**View database logs:**
```bash
docker-compose logs postgres
```

### Port Conflicts

If you see "port already in use":

```bash
# Check what's using port 5432
lsof -i :5432

# Stop conflicting service
# Then restart docker-compose
```

## Best Practices

### DO:
✅ Use `bun run docker:dev` for development
✅ Keep `.env` file up to date
✅ Commit Prisma schema changes
✅ Use `docker:dev:logs` to monitor changes
✅ Test in production mode before deploying

### DON'T:
❌ Edit files inside the container (use volumes)
❌ Commit `.env` file (use `.env.example`)
❌ Skip database migrations
❌ Mix development and production environments
❌ Forget to rebuild after changing `package.json`

## Performance Tips

1. **Use Background Mode** for faster iteration:
   ```bash
   bun run docker:dev:bg
   ```

2. **Keep Containers Running** between sessions:
   - Don't stop containers unless necessary
   - PostgreSQL data persists in volumes

3. **Use Docker BuildKit** for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   ```

4. **Prune Unused Resources** periodically:
   ```bash
   docker system prune -a
   ```

## Next Steps

- Read the [README.md](README.md) for full documentation
- Check [QUICKSTART.md](QUICKSTART.md) for setup guide
- Review `src/` directory structure
- Explore the feature-based architecture

Happy coding! 🚀
