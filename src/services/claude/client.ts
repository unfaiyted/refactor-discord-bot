import Anthropic from '@anthropic-ai/sdk';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import type { ExtractedContent } from '@services/content/types.js';
import { LIBRARY_TAGS, type LibraryType } from '@features/recommendations/config/library-tags.js';

/**
 * Claude AI client singleton
 */
export const anthropic = new Anthropic({
  apiKey: env.anthropic.apiKey,
});

export interface RecommendationMetadata {
  title: string;
  description: string;
  contentType: 'video' | 'podcast' | 'article' | 'book' | 'tool' | 'course' | 'other';
  topics: string[];
  duration: string | null;
  qualityScore: number;
  sentiment: 'positive' | 'neutral' | 'critical' | 'informative';
  summary: string;
  keyTakeaways?: string[];
  mainIdeas?: string[];
  tldr?: string;

  // Multi-library classification
  libraryType: 'fiction' | 'athenaeum' | 'growth';
  primaryTag: string;
  secondaryTags: string[];
}

/**
 * Generate library classification instructions for AI prompts
 */
function getLibraryClassificationInstructions(): string {
  return `
**LIBRARY CLASSIFICATION:**

You must classify this content into ONE of three libraries and select tags from that library's specific tag set:

**1. FICTION VAULT** - "${LIBRARY_TAGS.fiction.goal}"
   Focus: ${LIBRARY_TAGS.fiction.description}
   Available Tags: ${LIBRARY_TAGS.fiction.tags.map((t) => t.name).join(', ')}
   Use for: Novels, movies, TV shows, comics, manga, audio dramas, fictional podcasts, entertainment content, storytelling, creative works

**2. ATHENAEUM** - "${LIBRARY_TAGS.athenaeum.goal}"
   Focus: ${LIBRARY_TAGS.athenaeum.description}
   Available Tags: ${LIBRARY_TAGS.athenaeum.tags.map((t) => t.name).join(', ')}
   Use for: Educational content, academic topics, philosophy, history, social sciences, "deep" non-fiction, theoretical knowledge, understanding concepts

**3. GROWTH LAB** - "${LIBRARY_TAGS.growth.goal}"
   Focus: ${LIBRARY_TAGS.growth.description}
   Available Tags: ${LIBRARY_TAGS.growth.tags.map((t) => t.name).join(', ')}
   Use for: Skills development, career advice, productivity tools, self-help, health & fitness, practical guides, how-to content, applied knowledge

**Classification Guidelines:**
- Fiction vs Non-Fiction: If it's a story/narrative meant to entertain → Fiction Vault. Otherwise, determine if it's theoretical (Athenaeum) or practical (Growth Lab)
- Athenaeum vs Growth Lab: Theory/understanding/intellectual exploration → Athenaeum. Skills/application/self-improvement → Growth Lab
- Examples:
  - A sci-fi novel → Fiction Vault
  - A history documentary → Athenaeum
  - A coding tutorial → Growth Lab
  - A philosophy podcast → Athenaeum
  - A productivity app → Growth Lab
  - A fantasy movie → Fiction Vault

**Tag Selection:**
- Choose 1 PRIMARY TAG from the selected library's 20 tags (most relevant)
- Choose 1-4 SECONDARY TAGS from the SAME library's tags (additional relevant tags)
- Tags must come from the library you selected - DO NOT mix tags across libraries`;
}

/**
 * Analyze a recommendation using Claude AI (legacy - for URLs without content extraction)
 */
export async function analyzeRecommendation(
  url: string,
  messageContent: string,
  recommenderName: string
): Promise<RecommendationMetadata> {
  logger.debug('Analyzing recommendation with Claude', { url, recommenderName });

  const prompt = `You are analyzing a recommendation posted in a Discord server. The user "${recommenderName}" recommended the following:

URL: ${url}
Message: ${messageContent}

${getLibraryClassificationInstructions()}

Please analyze this recommendation and extract the following metadata:

1. **Title**: A clear, concise title for this recommendation
2. **Description**: A brief description (1-2 sentences) of what this content is about
3. **Content Type**: One of: video, podcast, article, book, tool, course, or other
4. **Topics**: An array of 2-4 topic tags from these categories: Tech, AI, Relationships, Fitness, Health, Infrastructure, Science, Psychology, Productivity, Nutrition, Mental Health, Self-Improvement, Career. Choose the most relevant ones.
5. **Duration**: Estimated length/duration if applicable (e.g., "45 minutes", "300 pages", "10 min read") or null
6. **Quality Score**: Rate from 1-10 based on the recommender's enthusiasm and the content's perceived value
7. **Sentiment**: The tone of the recommendation - one of: positive, neutral, critical, informative
8. **Summary**: A 2-3 sentence summary combining the recommender's perspective and what the content offers
9. **Library Type**: One of: fiction, athenaeum, growth (based on classification above)
10. **Primary Tag**: The most relevant tag from the selected library's tag set
11. **Secondary Tags**: Array of 1-4 additional relevant tags from the SAME library's tag set

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "description": "string",
  "contentType": "video|podcast|article|book|tool|course|other",
  "topics": ["string"],
  "duration": "string or null",
  "qualityScore": number,
  "sentiment": "positive|neutral|critical|informative",
  "summary": "string",
  "libraryType": "fiction|athenaeum|growth",
  "primaryTag": "string",
  "secondaryTags": ["string"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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

    const metadata: RecommendationMetadata = JSON.parse(jsonMatch[0]);

    logger.debug('Successfully analyzed recommendation', { metadata });
    return metadata;
  } catch (error) {
    logger.error('Failed to analyze recommendation with Claude', error);
    throw error;
  }
}

/**
 * Analyze extracted content with Claude AI (NEW - enhanced with full content)
 */
export async function analyzeExtractedContent(
  extractedContent: ExtractedContent,
  messageContent: string,
  recommenderName: string
): Promise<RecommendationMetadata> {
  logger.debug('Analyzing extracted content with Claude', {
    url: extractedContent.url,
    type: extractedContent.type,
    contentLength: extractedContent.content.length,
  });

  const prompt = `You are analyzing a recommendation posted in a Discord server. The user "${recommenderName}" recommended the following content:

**Recommender's Message:** ${messageContent}

**Content Details:**
- Title: ${extractedContent.title}
- Type: ${extractedContent.type}
- URL: ${extractedContent.url}

**Full Content:**
${extractedContent.content.slice(0, 100000)}

${getLibraryClassificationInstructions()}

Based on the full content above and the recommender's message, provide a comprehensive analysis:

1. **Title**: Use the extracted title or create a clear, descriptive one
2. **Description**: A brief description (1-2 sentences) of what this content is about
3. **Content Type**: One of: video, podcast, article, book, tool, course, or other
4. **Topics**: An array of 2-4 topic tags from these categories: Tech, AI, Relationships, Fitness, Health, Infrastructure, Science, Psychology, Productivity, Nutrition, Mental Health, Self-Improvement, Career. Choose the most relevant ones based on the actual content.
5. **Duration**: Estimated time to consume (e.g., "45 min", "10 min read") or null
6. **Quality Score**: Rate from 1-10 based on content depth, usefulness, and recommender's enthusiasm
7. **Sentiment**: One of: positive, neutral, critical, informative
8. **Summary**: A 2-3 sentence summary of the key points and value
9. **Key Takeaways**: Array of 3-5 main points/lessons from the content
10. **Main Ideas**: Array of 2-4 core concepts discussed
11. **TLDR**: A single sentence capturing the essence
12. **Library Type**: One of: fiction, athenaeum, growth (classify based on the content and guidelines above)
13. **Primary Tag**: The most relevant tag from the selected library's tag set
14. **Secondary Tags**: Array of 1-4 additional relevant tags from the SAME library's tag set

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "description": "string",
  "contentType": "video|podcast|article|book|tool|course|other",
  "topics": ["string"],
  "duration": "string or null",
  "qualityScore": number,
  "sentiment": "positive|neutral|critical|informative",
  "summary": "string",
  "keyTakeaways": ["string"],
  "mainIdeas": ["string"],
  "tldr": "string",
  "libraryType": "fiction|athenaeum|growth",
  "primaryTag": "string",
  "secondaryTags": ["string"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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

    const metadata: RecommendationMetadata = JSON.parse(jsonMatch[0]);

    logger.info('Successfully analyzed extracted content', {
      url: extractedContent.url,
      qualityScore: metadata.qualityScore,
      topicsCount: metadata.topics.length,
    });

    return metadata;
  } catch (error) {
    logger.error('Failed to analyze extracted content with Claude', error);
    throw error;
  }
}
