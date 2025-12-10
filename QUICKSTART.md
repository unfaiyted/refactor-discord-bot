# Quick Start Guide

Get your Refactor Discord Bot up and running in 5 minutes!

## Choose Your Setup Method

- **🐳 [Docker Setup](#docker-setup-recommended)** (Recommended) - Easiest, includes PostgreSQL
- **⚡ [Manual Setup](#manual-setup-with-bun)** - Direct installation with Bun

---

## Docker Setup (Recommended)

### Step 1: Install Docker

If you don't have Docker installed:

- **macOS/Windows**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Follow [Docker Engine installation](https://docs.docker.com/engine/install/)

### Step 2: Get Your API Keys

#### Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "Refactor Bot"
3. Go to "Bot" tab → Click "Add Bot"
4. Enable "Message Content Intent" under Privileged Gateway Intents
5. Click "Reset Token" and copy it

#### Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to API Keys
4. Create a new key and copy it

### Step 3: Set Up Environment

```bash
cp .env.docker .env
```

Edit `.env` and paste your keys:

```env
DISCORD_BOT_TOKEN=paste_your_discord_token_here
DISCORD_CLIENT_ID=paste_your_client_id_here
RECOMMENDATIONS_CHANNEL_ID=will_get_this_next
PROCESSED_RECOMMENDATIONS_FORUM_ID=will_get_this_next
ANTHROPIC_API_KEY=paste_your_anthropic_key_here
POSTGRES_PASSWORD=choose_a_secure_password
```

### Step 4: Set Up Discord Server

1. **Invite the bot** (replace YOUR_CLIENT_ID):

   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=412317273088&scope=bot
   ```

2. **Create channels**:
   - Create a text channel called `#recommendations`
   - Create a forum channel called `#library`

3. **Get channel IDs**:
   - Enable Developer Mode: Settings → Advanced → Developer Mode
   - Right-click each channel → Copy Channel ID
   - Paste into `.env`:
     ```env
     RECOMMENDATIONS_CHANNEL_ID=123456789012345678
     PROCESSED_RECOMMENDATIONS_FORUM_ID=123456789012345678
     ```

4. **Create forum tags** in `#library`:
   - 🎥 Video
   - 🎙️ Podcast
   - 📰 Article
   - 📚 Book
   - 🛠️ Tool
   - 🎓 Course

### Step 5: Start the Bot!

```bash
docker-compose up -d
```

**That's it!** The bot is now running with PostgreSQL included.

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f bot

# Stop the bot
docker-compose down

# Restart after changes
docker-compose up -d --build

# View database
docker-compose exec bot bunx prisma studio
```

---

## Manual Setup with Bun

### Step 1: Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Step 2: Install Dependencies

```bash
cd discord-bot
bun install
```

## Step 3: Get Your API Keys

### Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "Refactor Bot"
3. Go to "Bot" tab → Click "Add Bot"
4. Enable "Message Content Intent" under Privileged Gateway Intents
5. Click "Reset Token" and copy it

### Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to API Keys
4. Create a new key and copy it

## Step 4: Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and paste your keys:

```env
DISCORD_BOT_TOKEN=paste_your_discord_token_here
DISCORD_CLIENT_ID=paste_your_client_id_here
RECOMMENDATIONS_CHANNEL_ID=will_get_this_next
PROCESSED_RECOMMENDATIONS_FORUM_ID=will_get_this_next
ANTHROPIC_API_KEY=paste_your_anthropic_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/refactor_bot
```

## Step 5: Set Up PostgreSQL

### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb refactor_bot
```

### Option B: Use a Cloud Database

Services like [Supabase](https://supabase.com), [Railway](https://railway.app), or [Neon](https://neon.tech) offer free PostgreSQL databases.

Update `DATABASE_URL` in `.env` with your connection string.

## Step 6: Initialize Database

```bash
bun run db:generate
bun run db:push
```

## Step 7: Set Up Discord Server

1. **Invite the bot** (replace YOUR_CLIENT_ID):

   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=412317273088&scope=bot
   ```

2. **Create channels**:
   - Create a text channel called `#recommendations`
   - Create a forum channel called `#library` (or `#recs`, `#archive` - keep it short!)

3. **Get channel IDs**:
   - Enable Developer Mode: Settings → Advanced → Developer Mode
   - Right-click each channel → Copy Channel ID
   - Paste into `.env`:
     ```env
     RECOMMENDATIONS_CHANNEL_ID=123456789012345678
     PROCESSED_RECOMMENDATIONS_FORUM_ID=123456789012345678
     ```

4. **Create forum tags** in your forum channel (`#library`):
   - 🎥 Video
   - 🎙️ Podcast
   - 📰 Article
   - 📚 Book
   - 🛠️ Tool
   - 🎓 Course

## Step 8: Run the Bot!

```bash
bun run dev
```

You should see:

```
[INFO] Starting Refactor Discord Bot...
[INFO] Bot is ready! Logged in as Refactor Bot#1234
```

## Test It Out!

1. Go to your `#recommendations` channel
2. Post a message with a URL:
   ```
   Check out this awesome video! https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
3. The bot will:
   - React with 👀 (processing)
   - Analyze with Claude AI
   - Create a forum post
   - React with ✅ (success)

## Troubleshooting

**Bot doesn't see messages?**

- Make sure "Message Content Intent" is enabled in Discord Developer Portal
- Restart the bot after enabling

**Database errors?**

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL is correct

**Claude API errors?**

- Verify API key is correct
- Check you have credits at console.anthropic.com

## Next Steps

- Read the full [README.md](README.md) for architecture details
- Add more features in `src/features/`
- Customize the AI prompts in `src/services/claude/client.ts`

Need help? Check the logs for detailed error messages!
