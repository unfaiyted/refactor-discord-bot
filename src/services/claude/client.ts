import Anthropic from '@anthropic-ai/sdk';
import { env } from '@config/env.js';
import { logger } from '@utils/logger.js';
import type { ExtractedContent } from '@services/content/types.js';

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

Please analyze this recommendation and extract the following metadata:

1. **Title**: A clear, concise title for this recommendation
2. **Description**: A brief description (1-2 sentences) of what this content is about
3. **Content Type**: One of: video, podcast, article, book, tool, course, or other
4. **Topics**: An array of 2-5 relevant topic tags (e.g., ["programming", "web-development", "typescript"])
5. **Duration**: Estimated length/duration if applicable (e.g., "45 minutes", "300 pages", "10 min read") or null
6. **Quality Score**: Rate from 1-10 based on the recommender's enthusiasm and the content's perceived value
7. **Sentiment**: The tone of the recommendation - one of: positive, neutral, critical, informative
8. **Summary**: A 2-3 sentence summary combining the recommender's perspective and what the content offers

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "description": "string",
  "contentType": "video|podcast|article|book|tool|course|other",
  "topics": ["string"],
  "duration": "string or null",
  "qualityScore": number,
  "sentiment": "positive|neutral|critical|informative",
  "summary": "string"
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

Based on the full content above and the recommender's message, provide a comprehensive analysis:

1. **Title**: Use the extracted title or create a clear, descriptive one
2. **Description**: A brief description (1-2 sentences) of what this content is about
3. **Content Type**: One of: video, podcast, article, book, tool, course, or other
4. **Topics**: An array of 3-5 relevant topic tags based on the actual content
5. **Duration**: Estimated time to consume (e.g., "45 min", "10 min read") or null
6. **Quality Score**: Rate from 1-10 based on content depth, usefulness, and recommender's enthusiasm
7. **Sentiment**: One of: positive, neutral, critical, informative
8. **Summary**: A 2-3 sentence summary of the key points and value
9. **Key Takeaways**: Array of 3-5 main points/lessons from the content
10. **Main Ideas**: Array of 2-4 core concepts discussed
11. **TLDR**: A single sentence capturing the essence

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
  "tldr": "string"
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
