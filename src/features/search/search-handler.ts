import { Client, Message, EmbedBuilder, Collection } from 'discord.js';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import { recommendationService } from '@services/database/recommendations.js';
import { parseSearchQuery, type SearchQuery } from './query-parser.js';
import { LIBRARY_TAGS } from '@features/recommendations/config/library-tags.js';
import type { Recommendation } from '@prisma/client';

/**
 * Handle search queries in the search channel
 */
export async function handleSearchQuery(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process messages in search channel
  if (message.channelId !== env.discord.searchChannelId) return;

  const query = message.content.trim();

  if (!query) {
    await message.reply(
      'Please provide a search query! Examples:\n' +
        '• `fiction: #Fantasy #Novel`\n' +
        '• `find me productivity podcasts`\n' +
        '• `#Psychology #Book athenaeum: deep dives`\n' +
        '• `growth: coding tutorials for beginners`'
    );
    return;
  }

  logger.info('Processing search query', { query, user: message.author.tag });

  try {
    // Show typing indicator (only if channel supports it)
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    // Parse the query
    const searchQuery = await parseSearchQuery(query);

    logger.debug('Parsed search query', searchQuery);

    // Execute search
    const results = await executeSearch(searchQuery);

    logger.info('Search results found', { count: results.length, query });

    // Format and send results
    await sendSearchResults(message, searchQuery, results);
  } catch (error) {
    logger.error('Failed to process search query', error);
    await message.reply('Sorry, I encountered an error while searching. Please try again later.');
  }
}

/**
 * Execute search against the database
 */
async function executeSearch(searchQuery: SearchQuery): Promise<Recommendation[]> {
  const filters: any = {
    limit: searchQuery.limit || 20,
  };

  // Library filter
  if (searchQuery.libraryType && searchQuery.libraryType !== 'all') {
    filters.libraryType = searchQuery.libraryType;
  }

  // Tag filter
  if (searchQuery.tags && searchQuery.tags.length > 0) {
    filters.tags = searchQuery.tags;
  }

  // Content type filter
  if (searchQuery.contentType) {
    filters.contentType = searchQuery.contentType;
  }

  // Execute database search
  return await recommendationService.search(filters);
}

/**
 * Send formatted search results with thumbnails and rich formatting
 */
async function sendSearchResults(
  message: Message,
  searchQuery: SearchQuery,
  results: Recommendation[]
): Promise<void> {
  if (results.length === 0) {
    await message.reply(
      `No results found for your query${
        searchQuery.libraryType && searchQuery.libraryType !== 'all'
          ? ` in **${searchQuery.libraryType.toUpperCase()}** library`
          : ''
      }.\n\n` +
        'Try:\n' +
        '• Using different tags or keywords\n' +
        '• Searching in all libraries (remove library filter)\n' +
        '• Broadening your search terms'
    );
    return;
  }

  // Build summary embed with search info
  const summaryEmbed = new EmbedBuilder()
    .setTitle('🔍 Search Results')
    .setDescription(buildSearchSummary(searchQuery, results))
    .setColor(0x0099ff)
    .setTimestamp()
    .setFooter({
      text: `Showing top ${Math.min(results.length, 10)} of ${results.length} result${results.length !== 1 ? 's' : ''}`,
    });

  // Create individual result embeds with thumbnails (max 10 to avoid Discord limits)
  const resultEmbeds: EmbedBuilder[] = [];
  const maxResults = Math.min(results.length, 10);

  for (let i = 0; i < maxResults; i++) {
    const rec = results[i];
    const resultEmbed = buildResultEmbed(rec, message.guildId!, i + 1);
    resultEmbeds.push(resultEmbed);
  }

  // Send summary + result embeds (Discord allows up to 10 embeds per message)
  await message.reply({ embeds: [summaryEmbed, ...resultEmbeds] });
}

/**
 * Build an individual result embed with thumbnail and metadata
 */
function buildResultEmbed(rec: Recommendation, guildId: string, index: number): EmbedBuilder {
  const libraryEmoji = getLibraryEmoji(rec.libraryType as any);
  const libraryConfig = LIBRARY_TAGS[rec.libraryType as keyof typeof LIBRARY_TAGS];

  const embed = new EmbedBuilder()
    .setTitle(`${index}. ${rec.title || 'Untitled'}`)
    .setURL(getForumThreadUrl(guildId, rec.forumThreadId!))
    .setDescription(
      truncateText(rec.description || rec.aiSummary || 'No description available', 200)
    )
    .setColor(getLibraryColor(rec.libraryType as any));

  // Add thumbnail if available
  if (rec.thumbnail) {
    embed.setThumbnail(rec.thumbnail);
  }

  // Build tags display with emojis
  const tags: string[] = [];
  if (rec.primaryTag) {
    tags.push(`**${rec.primaryTag}**`);
  }
  if (rec.secondaryTags && rec.secondaryTags.length > 0) {
    tags.push(...rec.secondaryTags.slice(0, 3));
  }

  // Add metadata fields
  embed.addFields({
    name: '🏷️ Tags',
    value: tags.length > 0 ? tags.join(' • ') : 'No tags',
    inline: true,
  });

  embed.addFields({
    name: `${libraryEmoji} Library`,
    value: libraryConfig.description.split(':')[0].trim(),
    inline: true,
  });

  // Add content type and duration if available
  const metaParts: string[] = [];
  if (rec.contentType) {
    metaParts.push(`📦 ${rec.contentType.charAt(0).toUpperCase() + rec.contentType.slice(1)}`);
  }
  if (rec.duration) {
    metaParts.push(`⏱️ ${rec.duration}`);
  }
  if (rec.qualityScore) {
    metaParts.push(`⭐ ${rec.qualityScore}/10`);
  }

  if (metaParts.length > 0) {
    embed.addFields({
      name: '📊 Info',
      value: metaParts.join(' • '),
      inline: false,
    });
  }

  // Add link to original content
  if (rec.url) {
    embed.addFields({
      name: '🔗 Original Source',
      value: `[View Original](${rec.url})`,
      inline: false,
    });
  }

  return embed;
}

/**
 * Build search summary description
 */
function buildSearchSummary(searchQuery: SearchQuery, results: Recommendation[]): string {
  const parts: string[] = [];

  if (searchQuery.naturalLanguage) {
    parts.push(`**Query:** ${searchQuery.naturalLanguage}`);
  }

  if (searchQuery.tags && searchQuery.tags.length > 0) {
    parts.push(`**Tags:** ${searchQuery.tags.map((t) => `#${t}`).join(' ')}`);
  }

  if (searchQuery.contentType) {
    parts.push(`**Type:** ${searchQuery.contentType}`);
  }

  if (searchQuery.libraryType && searchQuery.libraryType !== 'all') {
    const libraryConfig = LIBRARY_TAGS[searchQuery.libraryType];
    parts.push(`**Library:** ${libraryConfig.description}`);
  } else {
    parts.push(`**Library:** All libraries`);
  }

  parts.push(`\n**Found:** ${results.length} recommendation${results.length !== 1 ? 's' : ''}`);

  return parts.join('\n');
}

/**
 * Group recommendations by library type
 */
function groupByLibrary(recommendations: Recommendation[]): Record<string, Recommendation[]> {
  const grouped: Record<string, Recommendation[]> = {
    fiction: [],
    athenaeum: [],
    growth: [],
  };

  for (const rec of recommendations) {
    if (rec.libraryType && grouped[rec.libraryType]) {
      grouped[rec.libraryType].push(rec);
    }
  }

  return grouped;
}

/**
 * Get forum thread URL
 */
function getForumThreadUrl(guildId: string, threadId: string): string {
  return `https://discord.com/channels/${guildId}/${threadId}`;
}

/**
 * Get library emoji
 */
function getLibraryEmoji(libraryType: 'fiction' | 'athenaeum' | 'growth'): string {
  switch (libraryType) {
    case 'fiction':
      return '📖';
    case 'athenaeum':
      return '🏛️';
    case 'growth':
      return '🌱';
    default:
      return '📚';
  }
}

/**
 * Get library color for embeds
 */
function getLibraryColor(libraryType: 'fiction' | 'athenaeum' | 'growth'): number {
  switch (libraryType) {
    case 'fiction':
      return 0x9b59b6; // Purple for stories/fiction
    case 'athenaeum':
      return 0x3498db; // Blue for knowledge/education
    case 'growth':
      return 0x2ecc71; // Green for growth/skills
    default:
      return 0x95a5a6; // Gray default
  }
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Register search handler with Discord client
 */
export function registerSearchHandler(client: Client): void {
  client.on('messageCreate', async (message) => {
    try {
      await handleSearchQuery(message);
    } catch (error) {
      logger.error('Error in search handler', error);
    }
  });

  logger.info('Search handler registered');
}
