import { anthropic } from './client.js';
import { logger } from '@utils/logger.js';
import type { Recommendation, ConversationMessage } from '@prisma/client';

export interface ThreadQuestionContext {
  recommendation: Recommendation;
  conversationHistory: ConversationMessage[];
  currentQuestion: string;
  userName: string;
}

export interface ConversationResponse {
  response: string;
  topicsDiscussed: string[];
  responseTime: number;
}

/**
 * Determine question complexity for adaptive response style
 */
function analyzeQuestionComplexity(question: string): 'simple' | 'moderate' | 'complex' {
  const questionLength = question.length;
  const hasMultipleQuestions = (question.match(/\?/g) || []).length > 1;
  const hasDetailedKeywords = /explain|analyze|compare|describe|why|how come/i.test(question);

  if (questionLength < 50 && !hasMultipleQuestions && !hasDetailedKeywords) {
    return 'simple';
  } else if (questionLength > 200 || hasMultipleQuestions) {
    return 'complex';
  }
  return 'moderate';
}

/**
 * Build system prompt with recommendation context and adaptive instructions
 */
function buildSystemPrompt(recommendation: Recommendation, questionComplexity: string): string {
  const adaptiveInstructions = {
    simple:
      'Provide a concise, direct answer. Keep it brief (1-3 sentences) unless more detail is specifically requested.',
    moderate:
      'Provide a clear, informative answer. Balance brevity with helpfulness (2-4 sentences typically).',
    complex:
      'Provide a thorough, detailed response. Break down complex topics, use examples, and explore different aspects as needed.',
  };

  return `You are a helpful AI assistant discussing a recommendation that was shared in a Discord server.

**RECOMMENDATION CONTEXT:**
- Title: ${recommendation.title || 'Untitled'}
- Type: ${recommendation.contentType || 'Unknown'}
- Topics: ${recommendation.topics?.join(', ') || 'None'}
${recommendation.duration ? `- Duration: ${recommendation.duration}` : ''}
${recommendation.qualityScore ? `- Quality Score: ${recommendation.qualityScore}/10` : ''}

**SUMMARY:**
${recommendation.aiSummary || 'No summary available'}

${recommendation.description ? `**DESCRIPTION:**\n${recommendation.description}\n` : ''}

**YOUR ROLE:**
You're helping users understand and discuss this recommendation. ${adaptiveInstructions[questionComplexity]}

**GUIDELINES:**
- Reference the recommendation's content when relevant
- Be conversational and friendly
- If asked about specific details not in the context, acknowledge the limitation
- Adapt your response length to the question complexity
- Use markdown formatting for readability when appropriate
- For questions about the original content URL: ${recommendation.url}

Remember: You're discussing THIS specific recommendation, not general knowledge about the topic.`;
}

/**
 * Format conversation history for Claude API
 */
function formatConversationHistory(
  messages: ConversationMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((msg) => ({
    role: msg.isBot ? ('assistant' as const) : ('user' as const),
    content: msg.isBot ? msg.aiResponse || msg.content : `${msg.userName}: ${msg.content}`,
  }));
}

/**
 * Extract discussed topics from a message using simple keyword extraction
 */
function extractTopicsFromMessage(message: string, recommendationTopics: string[]): string[] {
  const topics: string[] = [];
  const messageLower = message.toLowerCase();

  // Check if message discusses any of the recommendation's original topics
  for (const topic of recommendationTopics) {
    if (messageLower.includes(topic.toLowerCase())) {
      topics.push(topic);
    }
  }

  // Common discussion topics
  const commonTopics = [
    'implementation',
    'example',
    'comparison',
    'benefits',
    'drawbacks',
    'application',
    'summary',
    'details',
    'clarification',
  ];

  for (const topic of commonTopics) {
    if (messageLower.includes(topic)) {
      topics.push(topic);
    }
  }

  return [...new Set(topics)]; // Remove duplicates
}

/**
 * Respond to a thread question with full context and conversation history
 */
export async function respondToThreadQuestion(
  context: ThreadQuestionContext
): Promise<ConversationResponse> {
  const startTime = Date.now();

  try {
    logger.info('Generating thread response', {
      threadId: context.recommendation.forumThreadId,
      userName: context.userName,
      questionLength: context.currentQuestion.length,
      historyLength: context.conversationHistory.length,
    });

    // Analyze question complexity
    const complexity = analyzeQuestionComplexity(context.currentQuestion);

    // Build system prompt with recommendation context
    const systemPrompt = buildSystemPrompt(context.recommendation, complexity);

    // Format conversation history
    const formattedHistory = formatConversationHistory(context.conversationHistory);

    // Add current question
    const messages = [
      ...formattedHistory,
      {
        role: 'user' as const,
        content: `${context.userName}: ${context.currentQuestion}`,
      },
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: complexity === 'complex' ? 2048 : complexity === 'moderate' ? 1024 : 512,
      system: systemPrompt,
      messages,
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const responseText = responseContent.text;
    const responseTime = Date.now() - startTime;

    // Extract topics discussed in this exchange
    const topicsDiscussed = extractTopicsFromMessage(
      context.currentQuestion + ' ' + responseText,
      context.recommendation.topics || []
    );

    logger.info('Successfully generated thread response', {
      threadId: context.recommendation.forumThreadId,
      responseLength: responseText.length,
      responseTime,
      complexity,
      topicsDiscussed,
    });

    return {
      response: responseText,
      topicsDiscussed,
      responseTime,
    };
  } catch (error) {
    logger.error('Failed to generate thread response', {
      threadId: context.recommendation.forumThreadId,
      error,
    });
    throw error;
  }
}

/**
 * Generate a summary of topics discussed in a conversation
 * (Used by analytics service)
 */
export async function analyzeConversationTopics(
  messages: ConversationMessage[],
  recommendation: Recommendation
): Promise<string[]> {
  try {
    // Simple keyword extraction from all messages
    const allTopics = new Set<string>();

    for (const message of messages) {
      const topics = extractTopicsFromMessage(message.content, recommendation.topics || []);
      topics.forEach((topic) => allTopics.add(topic));
    }

    // If we have enough messages, we could optionally use Claude for more sophisticated analysis
    // For now, return the extracted keywords
    return Array.from(allTopics);
  } catch (error) {
    logger.error('Failed to analyze conversation topics', { error });
    return [];
  }
}
