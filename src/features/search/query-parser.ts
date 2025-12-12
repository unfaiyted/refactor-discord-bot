import { anthropic } from '@services/claude/client.js';
import { logger } from '@utils/logger.js';
import { LIBRARY_TAGS, type LibraryType } from '@features/recommendations/config/library-tags.js';

export interface SearchQuery {
  // Library filter
  libraryType?: LibraryType | 'all';

  // Structured filters
  tags?: string[];
  contentType?: string;

  // Natural language query
  naturalLanguage?: string;

  // Result limit
  limit?: number;
}

/**
 * Parse a user query into structured search parameters
 * Supports:
 * - Natural language: "find me sci-fi books about AI"
 * - Hashtags: "#Fantasy #Novel"
 * - Library prefix: "fiction: fantasy books" or "@fiction fantasy"
 * - Hybrid: "fiction: #Fantasy find me space operas"
 */
export async function parseSearchQuery(query: string): Promise<SearchQuery> {
  logger.debug('Parsing search query', { query });

  // Extract hashtags (structured tags)
  const hashtagRegex = /#(\w+(?:\/\w+)?(?:\s+\w+)?)/gi;
  const hashtags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(query)) !== null) {
    hashtags.push(match[1]);
  }

  // Remove hashtags from query for natural language processing
  const queryWithoutHashtags = query.replace(hashtagRegex, '').trim();

  // Extract library filter
  let libraryType: LibraryType | 'all' | undefined;
  let remainingQuery = queryWithoutHashtags;

  // Check for library prefix patterns
  const libraryPrefixRegex = /^(?:@|in\s+)?(\w+):\s*/i;
  const libraryMatch = queryWithoutHashtags.match(libraryPrefixRegex);

  if (libraryMatch) {
    const libraryName = libraryMatch[1].toLowerCase();
    if (libraryName === 'fiction' || libraryName === 'vault') {
      libraryType = 'fiction';
    } else if (libraryName === 'athenaeum' || libraryName === 'education') {
      libraryType = 'athenaeum';
    } else if (libraryName === 'growth' || libraryName === 'lab') {
      libraryType = 'growth';
    } else if (libraryName === 'all' || libraryName === 'everywhere') {
      libraryType = 'all';
    }
    remainingQuery = queryWithoutHashtags.replace(libraryPrefixRegex, '').trim();
  }

  // If there are hashtags, we have structured query
  if (hashtags.length > 0) {
    return {
      libraryType,
      tags: hashtags,
      naturalLanguage: remainingQuery || undefined,
      limit: 20,
    };
  }

  // Pure natural language query - use Claude to interpret
  if (remainingQuery) {
    return await parseNaturalLanguageQuery(remainingQuery, libraryType);
  }

  // Empty query - return all
  return {
    libraryType: libraryType || 'all',
    limit: 20,
  };
}

/**
 * Use Claude AI to parse a natural language query into structured filters
 */
async function parseNaturalLanguageQuery(
  query: string,
  libraryType?: LibraryType | 'all'
): Promise<SearchQuery> {
  logger.debug('Parsing natural language query with Claude', { query, libraryType });

  const prompt = `You are a search query parser for a recommendation library system with three specialized libraries:

**1. FICTION VAULT** - ${LIBRARY_TAGS.fiction.description}
   Tags: ${LIBRARY_TAGS.fiction.tags.map((t) => t.name).join(', ')}

**2. ATHENAEUM** - ${LIBRARY_TAGS.athenaeum.description}
   Tags: ${LIBRARY_TAGS.athenaeum.tags.map((t) => t.name).join(', ')}

**3. GROWTH LAB** - ${LIBRARY_TAGS.growth.description}
   Tags: ${LIBRARY_TAGS.growth.tags.map((t) => t.name).join(', ')}

User query: "${query}"
${libraryType && libraryType !== 'all' ? `Library context: User wants to search in ${libraryType.toUpperCase()} library` : ''}

Parse this query into structured search parameters:
1. **Library Type**: Which library should be searched? (fiction, athenaeum, growth, or all). If not specified and context is unclear, use "all".
2. **Tags**: Which tags from the libraries match this query? Select 1-5 most relevant tags. If searching multiple libraries, tags can come from any library.
3. **Content Type**: If the query specifies a format (video, podcast, article, book, tool, course), include it.

Examples:
- "find me sci-fi books about AI" → library: fiction, tags: ["Sci-Fi", "Novel/Book"], contentType: book
- "philosophy podcasts" → library: athenaeum, tags: ["Philosophy", "Podcast"], contentType: podcast
- "coding tutorials for beginners" → library: growth, tags: ["Tech & Code", "Video/Course", "Beginner"], contentType: course
- "emotional fantasy novels" → library: fiction, tags: ["Fantasy", "Novel/Book", "Emotional"]
- "productivity tips" → library: growth, tags: ["Productivity", "Quick Tip"]

Respond ONLY with valid JSON in this exact format:
{
  "libraryType": "fiction|athenaeum|growth|all",
  "tags": ["tag1", "tag2"],
  "contentType": "video|podcast|article|book|tool|course" or null
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const result: SearchQuery = {
      libraryType: libraryType || parsed.libraryType || 'all',
      tags: parsed.tags || [],
      contentType: parsed.contentType || undefined,
      naturalLanguage: query,
      limit: 20,
    };

    logger.debug('Parsed natural language query', result);
    return result;
  } catch (error) {
    logger.error('Failed to parse natural language query', error);

    // Fallback to simple keyword-based search
    return {
      libraryType: libraryType || 'all',
      naturalLanguage: query,
      limit: 20,
    };
  }
}
