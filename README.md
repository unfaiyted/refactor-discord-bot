# Refactor Discord Bot

A high-performance Discord bot built with Bun, TypeScript, and Claude AI for intelligent recommendation management.

## Features

- **Automatic Recommendation Processing**: Monitors a designated channel for recommendations
- **AI-Powered Analysis**: Uses Claude AI to extract metadata from recommendations including:
  - Content type (video, podcast, article, book, tool, course)
  - Topic categorization
  - Duration/length estimation
  - Quality scoring (1-10)
  - Sentiment analysis
  - Intelligent summaries
- **Forum Organization**: Automatically creates organized forum posts with:
  - Rich embeds with metadata
  - Auto-applied tags for content types and topics
  - Searchable and filterable content
  - Links back to original messages
- **Scalable Architecture**: Feature-based modular design for easy extensibility
- **Fast Performance**: Built on Bun runtime (3x faster than Node.js)
- **Dual Database Layer**: PostgreSQL for persistence + SQLite for caching

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime with native TypeScript support
- **Language**: TypeScript
- **Discord Library**: discord.js v14+
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Bun SQLite (built-in)
- **AI**: Anthropic Claude API

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- PostgreSQL database
- Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- Anthropic API Key ([Get one here](https://console.anthropic.com))

## Installation

1. **Clone and install dependencies**:
   ```bash
   cd discord-bot
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your values:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   RECOMMENDATIONS_CHANNEL_ID=your_recommendations_channel_id
   PROCESSED_RECOMMENDATIONS_FORUM_ID=your_forum_channel_id
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   DATABASE_URL=postgresql://username:password@localhost:5432/refactor_bot?schema=public
   ```

3. **Set up the database**:
   ```bash
   # Generate Prisma client
   bun run db:generate

   # Push schema to database
   bun run db:push
   ```

## Discord Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
   - Server Members Intent (optional)
   - Presence Intent (optional)
5. Copy the bot token and add to `.env`

### 2. Invite Bot to Server

Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=412317273088&scope=bot
```

Permissions included:
- Read Messages/View Channels
- Send Messages
- Create Public Threads
- Manage Threads
- Embed Links
- Add Reactions
- Read Message History

### 3. Set Up Discord Channels

1. **Create a recommendations channel** (regular text channel)
   - Name it `#recommendations` or similar
   - Right-click the channel → Copy Channel ID
   - Add to `.env` as `RECOMMENDATIONS_CHANNEL_ID`

2. **Create a forum channel** for the organized library
   - **Recommended names**: `#library`, `#recs`, `#archive`, `#catalog`
   - Keep it short and memorable!
   - Right-click → Copy Channel ID
   - Add to `.env` as `PROCESSED_RECOMMENDATIONS_FORUM_ID`

3. **Create Forum Tags** (optional but recommended):
   - Go to your forum channel settings
   - Add tags for content types:
     - 🎥 Video
     - 🎙️ Podcast
     - 📰 Article
     - 📚 Book
     - 🛠️ Tool
     - 🎓 Course

## Running the Bot

### Development Mode (with hot reload):
```bash
bun run dev
```

### Production Mode:
```bash
bun run start
```

## How It Works

1. **User posts a recommendation** in `#recommendations` channel with a URL
2. **Bot detects the message** and adds a 👀 reaction to show it's processing
3. **URL extraction**: Extracts the first URL from the message
4. **Database storage**: Creates a record in PostgreSQL
5. **AI Analysis**: Sends to Claude AI for metadata extraction
6. **Forum post creation**: Creates a rich forum post in your library forum channel
7. **Success notification**: Adds ✅ reaction to original message

## Project Structure

```
src/
├── features/
│   └── recommendations/          # Recommendation processing feature
│       ├── events/               # Message event handlers
│       ├── services/             # Business logic (processor, forum poster)
│       └── types/                # TypeScript type definitions
├── services/
│   ├── claude/                   # Claude AI integration
│   ├── database/                 # PostgreSQL database services
│   └── cache/                    # Bun SQLite caching
├── utils/                        # Utilities (logger, URL extraction)
├── config/                       # Configuration management
└── index.ts                      # Bot entry point
```

## Database Schema

### Recommendations Table
Stores all processed recommendations with metadata:
- Original message info (ID, channel, content, author)
- Extracted URL and basic info
- AI-generated metadata (type, topics, duration, quality, sentiment)
- Forum post references
- Processing status and error tracking

### Guild Config Table
Stores per-server configuration (for multi-server support)

### Processing Log Table
Audit trail of all processing operations

## Adding New Features

This bot is built with extensibility in mind. To add new features:

1. Create a new directory in `src/features/`
2. Add event handlers in `features/your-feature/events/`
3. Implement business logic in `features/your-feature/services/`
4. Register events in `src/index.ts`

Example structure:
```
src/features/your-feature/
├── events/
│   └── handler.ts
├── services/
│   └── service.ts
└── types/
    └── index.ts
```

## Troubleshooting

### Bot doesn't respond to messages
- Verify `Message Content Intent` is enabled in Discord Developer Portal
- Check that channel IDs are correct in `.env`
- Ensure bot has permissions to read messages in the channel

### Database connection errors
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env` is correct
- Run `bun run db:push` to sync schema

### Claude API errors
- Verify `ANTHROPIC_API_KEY` is valid
- Check API quota/limits at console.anthropic.com
- Review logs for specific error messages

### Forum posts not created
- Verify the forum channel exists and ID is correct
- Ensure bot has "Create Public Threads" permission
- Check bot has access to the forum channel

## Scripts

- `bun run dev` - Start bot in development mode with hot reload
- `bun run start` - Start bot in production mode
- `bun run db:generate` - Generate Prisma client
- `bun run db:push` - Push schema changes to database
- `bun run db:migrate` - Create a new migration
- `bun run db:studio` - Open Prisma Studio (database GUI)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot token from Developer Portal | Yes |
| `DISCORD_CLIENT_ID` | Discord application client ID | Yes |
| `RECOMMENDATIONS_CHANNEL_ID` | Channel to monitor for recommendations | Yes |
| `PROCESSED_RECOMMENDATIONS_FORUM_ID` | Forum channel for processed posts | Yes |
| `ANTHROPIC_API_KEY` | Claude API key from Anthropic | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | No |

## Performance

Built with Bun for optimal performance:
- **Fast startup**: ~3x faster cold starts than Node.js
- **Native TypeScript**: No compilation step needed
- **Built-in SQLite**: Ultra-fast caching layer
- **Connection pooling**: Efficient database connections
- **Async/await**: Non-blocking I/O throughout

## License

MIT

## Contributing

This bot is designed for the Refactor Discord server but can be adapted for other communities. Feel free to fork and modify for your needs.
