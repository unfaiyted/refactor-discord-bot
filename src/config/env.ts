import { config } from 'dotenv';

// Load environment variables
config();

interface EnvConfig {
  discord: {
    token: string;
    clientId: string;
    recommendationsChannelId: string;
    fictionVaultForumId: string; // Fiction Vault library (novels, movies, comics)
    athenaeumForumId: string; // Athenaeum library (non-fiction, education, history)
    growthLabForumId: string; // Growth Lab library (self-improvement, skills, health)
    searchChannelId: string; // Search channel for querying recommendations
  };
  anthropic: {
    apiKey: string;
  };
  database: {
    url: string;
  };
  app: {
    nodeEnv: string;
    logLevel: string;
  };
}

/**
 * Validates and returns environment configuration
 * Throws error if required environment variables are missing
 */
function validateEnv(): EnvConfig {
  const required = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'RECOMMENDATIONS_CHANNEL_ID',
    'FICTION_VAULT_FORUM_ID',
    'ATHENAEUM_FORUM_ID',
    'GROWTH_LAB_FORUM_ID',
    'SEARCH_CHANNEL_ID',
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please copy .env.example to .env and fill in the required values.'
    );
  }

  return {
    discord: {
      token: process.env.DISCORD_BOT_TOKEN!,
      clientId: process.env.DISCORD_CLIENT_ID!,
      recommendationsChannelId: process.env.RECOMMENDATIONS_CHANNEL_ID!,
      fictionVaultForumId: process.env.FICTION_VAULT_FORUM_ID!,
      athenaeumForumId: process.env.ATHENAEUM_FORUM_ID!,
      growthLabForumId: process.env.GROWTH_LAB_FORUM_ID!,
      searchChannelId: process.env.SEARCH_CHANNEL_ID!,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  };
}

export const env = validateEnv();
