/**
 * Library-specific tag configurations for the multi-library system
 *
 * Three libraries:
 * 1. Fiction Vault - Stories, Art, Imagination, Entertainment
 * 2. Athenaeum - Humanities, Social Sciences, History, "Deep" Non-Fiction
 * 3. Growth Lab - Career, Tech, Hard Skills, Lifestyle, Productivity
 *
 * Each library has 20 tags organized into categories
 */

export type LibraryType = 'fiction' | 'athenaeum' | 'growth';

export interface LibraryTagConfig {
  name: string;
  emoji: string;
  synonyms: string[];
}

export interface LibraryConfig {
  tags: LibraryTagConfig[];
  description: string;
  goal: string;
}

/**
 * Fiction Vault Tags (20 total)
 * Focus: Stories, Art, Imagination, and Entertainment
 * Goal: "I want to be entertained or immersed in a story."
 */
const FICTION_VAULT_TAGS: LibraryTagConfig[] = [
  // Format (4 tags)
  {
    name: 'Novel/Book',
    emoji: '📖',
    synonyms: ['novel', 'book', 'fiction book', 'literature', 'story', 'narrative'],
  },
  {
    name: 'Movie/Series',
    emoji: '🎬',
    synonyms: ['movie', 'film', 'series', 'show', 'tv show', 'television', 'cinema', 'streaming'],
  },
  {
    name: 'Audio Drama',
    emoji: '🎭',
    synonyms: ['audio drama', 'radio drama', 'fiction podcast', 'narrative podcast', 'audio story'],
  },
  {
    name: 'Comic/Manga',
    emoji: '📚',
    synonyms: ['comic', 'manga', 'graphic novel', 'comic book', 'webcomic', 'manhwa'],
  },

  // Genre (12 tags)
  {
    name: 'Fantasy',
    emoji: '🧙',
    synonyms: [
      'fantasy',
      'high fantasy',
      'magic',
      'wizards',
      'dragons',
      'epic fantasy',
      'urban fantasy',
    ],
  },
  {
    name: 'Sci-Fi',
    emoji: '🚀',
    synonyms: [
      'sci-fi',
      'science fiction',
      'space',
      'cyberpunk',
      'dystopia',
      'futuristic',
      'aliens',
    ],
  },
  {
    name: 'Horror',
    emoji: '👻',
    synonyms: [
      'horror',
      'supernatural',
      'psychological horror',
      'thriller horror',
      'scary',
      'terror',
    ],
  },
  {
    name: 'Thriller/Mystery',
    emoji: '🔍',
    synonyms: ['thriller', 'mystery', 'crime', 'suspense', 'detective', 'whodunit', 'noir'],
  },
  {
    name: 'Romance',
    emoji: '💕',
    synonyms: ['romance', 'love story', 'contemporary romance', 'historical romance', 'romantic'],
  },
  {
    name: 'Historical Fic',
    emoji: '⏳',
    synonyms: ['historical fiction', 'historical', 'period piece', 'past', 'historical drama'],
  },
  {
    name: 'Comedy/Satire',
    emoji: '😂',
    synonyms: ['comedy', 'satire', 'humor', 'funny', 'humorous', 'parody', 'stand-up'],
  },
  {
    name: 'Drama/Lit',
    emoji: '🎭',
    synonyms: ['drama', 'literary fiction', 'serious', 'character study', 'literary'],
  },
  {
    name: 'Classics',
    emoji: '📜',
    synonyms: ['classics', 'classic literature', 'canonical', 'pre-1950', 'timeless'],
  },
  {
    name: 'Young Adult',
    emoji: '🌟',
    synonyms: ['young adult', 'ya', 'teen', 'coming of age', 'adolescent'],
  },
  {
    name: 'Mythology/Lore',
    emoji: '⚔️',
    synonyms: ['mythology', 'myth', 'lore', 'legend', 'folklore', 'mythological'],
  },
  {
    name: 'Art/Animation',
    emoji: '🎨',
    synonyms: ['art', 'animation', 'visual', 'animated', 'art book', 'illustrated'],
  },

  // Vibe (4 tags)
  {
    name: 'Fast Paced',
    emoji: '⚡',
    synonyms: ['fast paced', 'page-turner', 'action-packed', 'thrilling', 'intense', 'gripping'],
  },
  {
    name: 'Slow Burn',
    emoji: '🕯️',
    synonyms: ['slow burn', 'atmospheric', 'slow-paced', 'contemplative', 'gradual'],
  },
  {
    name: 'Emotional',
    emoji: '😢',
    synonyms: ['emotional', 'tear-jerker', 'moving', 'heartbreaking', 'touching', 'poignant'],
  },
  {
    name: 'Masterpiece',
    emoji: '⭐',
    synonyms: [
      'masterpiece',
      'perfect',
      '10/10',
      'must-read',
      'must-watch',
      'essential',
      'classic',
    ],
  },
];

/**
 * Athenaeum Tags (20 total)
 * Focus: Humanities, Social Sciences, History, and "Deep" Non-Fiction
 * Goal: "I want to understand the world, the past, or the human mind."
 */
const ATHENAEUM_TAGS: LibraryTagConfig[] = [
  // Format (4 tags)
  {
    name: 'Book',
    emoji: '📕',
    synonyms: ['non-fiction book', 'nonfiction', 'educational book', 'informative book'],
  },
  {
    name: 'Podcast',
    emoji: '🎙️',
    synonyms: ['educational podcast', 'interview', 'talk show', 'discussion', 'conversation'],
  },
  {
    name: 'Essay/Paper',
    emoji: '📄',
    synonyms: ['essay', 'paper', 'article', 'academic', 'long-read', 'publication'],
  },
  {
    name: 'Documentary',
    emoji: '🎥',
    synonyms: ['documentary', 'doc', 'educational video', 'nonfiction film', 'informative video'],
  },

  // Topic (12 tags)
  {
    name: 'History',
    emoji: '🏛️',
    synonyms: ['history', 'historical', 'ancient', 'modern history', 'past events', 'civilization'],
  },
  {
    name: 'Philosophy',
    emoji: '🤔',
    synonyms: ['philosophy', 'ethics', 'logic', 'existentialism', 'metaphysics', 'philosophical'],
  },
  {
    name: 'Psychology',
    emoji: '🧠',
    synonyms: ['psychology', 'behavior', 'mind', 'cognitive', 'mental processes', 'psychological'],
  },
  {
    name: 'Politics/Society',
    emoji: '🏛️',
    synonyms: ['politics', 'society', 'current events', 'sociology', 'social issues', 'government'],
  },
  {
    name: 'Anthropology',
    emoji: '🌍',
    synonyms: ['anthropology', 'culture', 'cultures', 'religion', 'human societies', 'ethnography'],
  },
  {
    name: 'Hard Science',
    emoji: '🔬',
    synonyms: ['science', 'physics', 'biology', 'chemistry', 'mathematics', 'nature', 'scientific'],
  },
  {
    name: 'True Crime',
    emoji: '🔪',
    synonyms: ['true crime', 'crime', 'investigative journalism', 'murder', 'criminal justice'],
  },
  {
    name: 'Biography',
    emoji: '👤',
    synonyms: ['biography', 'memoir', 'autobiography', 'life story', 'biographical'],
  },
  {
    name: 'Literature Analysis',
    emoji: '📖',
    synonyms: ['literature analysis', 'literary criticism', 'book analysis', 'literary theory'],
  },
  {
    name: 'Art History',
    emoji: '🖼️',
    synonyms: ['art history', 'art', 'artistic movements', 'artists', 'visual arts'],
  },
  {
    name: 'Linguistics/Lang',
    emoji: '🗣️',
    synonyms: ['linguistics', 'language', 'languages', 'communication', 'linguistic'],
  },
  {
    name: 'Fringe/Mystery',
    emoji: '👽',
    synonyms: [
      'fringe',
      'mystery',
      'unexplained',
      'paranormal',
      'conspiracy',
      'mysterious phenomena',
    ],
  },

  // Utility (4 tags)
  {
    name: 'Academic',
    emoji: '🎓',
    synonyms: ['academic', 'scholarly', 'dense', 'rigorous', 'complex', 'technical'],
  },
  {
    name: 'Intro/Pop',
    emoji: '📘',
    synonyms: [
      'intro',
      'introduction',
      'pop science',
      'popular',
      'accessible',
      'beginner-friendly',
    ],
  },
  {
    name: 'Deep Dive',
    emoji: '🕳️',
    synonyms: ['deep dive', 'long-form', 'in-depth', 'comprehensive', 'thorough', 'detailed'],
  },
  {
    name: 'Hot Topic',
    emoji: '🔥',
    synonyms: ['hot topic', 'trending', 'current', 'debated', 'controversial', 'topical'],
  },
];

/**
 * Growth Lab Tags (20 total)
 * Focus: Career, Tech, Hard Skills, Lifestyle, and Productivity
 * Goal: "I want to upgrade my life, my job, or my skills."
 */
const GROWTH_LAB_TAGS: LibraryTagConfig[] = [
  // Format (4 tags)
  {
    name: 'Book',
    emoji: '📗',
    synonyms: ['manual', 'guide', 'self-help book', 'how-to book', 'instructional'],
  },
  {
    name: 'Podcast',
    emoji: '🎧',
    synonyms: ['tech podcast', 'business podcast', 'hustle pod', 'interview podcast'],
  },
  {
    name: 'Video/Course',
    emoji: '🎬',
    synonyms: ['tutorial', 'course', 'video tutorial', 'how-to video', 'online course', 'training'],
  },
  {
    name: 'Tool/Resource',
    emoji: '🛠️',
    synonyms: ['tool', 'resource', 'app', 'website', 'software', 'platform', 'repository'],
  },

  // Topic (12 tags)
  {
    name: 'Tech & Code',
    emoji: '💻',
    synonyms: [
      'tech',
      'technology',
      'code',
      'coding',
      'programming',
      'development',
      'software',
      'ai',
    ],
  },
  {
    name: 'Business/Econ',
    emoji: '💼',
    synonyms: ['business', 'economics', 'startup', 'entrepreneurship', 'commerce', 'economy'],
  },
  {
    name: 'Finance',
    emoji: '💰',
    synonyms: [
      'finance',
      'investing',
      'investment',
      'crypto',
      'personal finance',
      'money',
      'wealth',
    ],
  },
  {
    name: 'Marketing/Create',
    emoji: '📱',
    synonyms: [
      'marketing',
      'social media',
      'content creation',
      'advertising',
      'branding',
      'creator',
    ],
  },
  {
    name: 'Productivity',
    emoji: '⚡',
    synonyms: ['productivity', 'efficiency', 'time management', 'organization', 'gtd', 'systems'],
  },
  {
    name: 'Leadership',
    emoji: '👔',
    synonyms: [
      'leadership',
      'management',
      'soft skills',
      'team building',
      'executive',
      'leadership',
    ],
  },
  {
    name: 'Health & Fitness',
    emoji: '💪',
    synonyms: [
      'health',
      'fitness',
      'gym',
      'exercise',
      'workout',
      'training',
      'biohacking',
      'wellness',
    ],
  },
  {
    name: 'Mental Health',
    emoji: '🧘',
    synonyms: [
      'mental health',
      'mindfulness',
      'meditation',
      'therapy',
      'stress management',
      'coping',
    ],
  },
  {
    name: 'Food/Cooking',
    emoji: '🍳',
    synonyms: ['food', 'cooking', 'nutrition', 'diet', 'recipes', 'culinary', 'meal prep'],
  },
  {
    name: 'Travel/Digital Nomad',
    emoji: '✈️',
    synonyms: ['travel', 'digital nomad', 'remote work', 'nomad', 'wanderlust', 'adventure'],
  },
  {
    name: 'DIY/Home',
    emoji: '🏠',
    synonyms: ['diy', 'home', 'home improvement', 'crafts', 'handyman', 'maker'],
  },
  {
    name: 'Style/Design',
    emoji: '👗',
    synonyms: ['style', 'design', 'fashion', 'aesthetics', 'interior design', 'visual design'],
  },

  // Utility (4 tags)
  {
    name: 'Beginner',
    emoji: '🌱',
    synonyms: ['beginner', 'start here', 'intro', 'basics', 'fundamentals', 'novice'],
  },
  {
    name: 'Advanced',
    emoji: '🚀',
    synonyms: ['advanced', 'expert', 'professional', 'sophisticated', 'complex', 'high-level'],
  },
  {
    name: 'Quick Tip',
    emoji: '⏱️',
    synonyms: ['quick tip', 'short', 'brief', 'summary', 'tldr', 'quick win'],
  },
  {
    name: 'Gold Standard',
    emoji: '🏆',
    synonyms: [
      'gold standard',
      'best',
      'industry standard',
      'definitive',
      'authoritative',
      'top-tier',
    ],
  },
];

/**
 * Complete library configuration
 */
export const LIBRARY_TAGS: Record<LibraryType, LibraryConfig> = {
  fiction: {
    tags: FICTION_VAULT_TAGS,
    description: 'Stories, Art, Imagination, and Entertainment',
    goal: 'I want to be entertained or immersed in a story.',
  },
  athenaeum: {
    tags: ATHENAEUM_TAGS,
    description: 'Humanities, Social Sciences, History, and "Deep" Non-Fiction',
    goal: 'I want to understand the world, the past, or the human mind.',
  },
  growth: {
    tags: GROWTH_LAB_TAGS,
    description: 'Career, Tech, Hard Skills, Lifestyle, and Productivity',
    goal: 'I want to upgrade my life, my job, or my skills.',
  },
};

/**
 * Get all tag names for a specific library
 */
export function getLibraryTagNames(libraryType: LibraryType): string[] {
  return LIBRARY_TAGS[libraryType].tags.map((tag) => tag.name);
}

/**
 * Get all synonyms for a specific library (flattened)
 */
export function getLibrarySynonyms(libraryType: LibraryType): Record<string, string[]> {
  const synonymMap: Record<string, string[]> = {};

  LIBRARY_TAGS[libraryType].tags.forEach((tag) => {
    const tagNameLower = tag.name.toLowerCase();
    synonymMap[tagNameLower] = tag.synonyms;
  });

  return synonymMap;
}

/**
 * Find matching tag from a topic string using synonyms
 */
export function findMatchingTag(
  topic: string,
  libraryType: LibraryType,
  availableTags: Array<{ name: string; id: string }>,
  alreadyApplied: string[]
): { name: string; id: string } | undefined {
  const topicLower = topic.toLowerCase();
  const libraryTags = LIBRARY_TAGS[libraryType].tags;

  // Check if topic contains any tag name or synonyms
  for (const tag of availableTags) {
    if (alreadyApplied.includes(tag.id)) continue;

    const tagNameLower = tag.name.toLowerCase();

    // Find the corresponding library tag config
    const tagConfig = libraryTags.find((t) => t.name.toLowerCase() === tagNameLower);
    if (!tagConfig) continue;

    // Check if topic contains the tag name or vice versa
    if (topicLower.includes(tagNameLower) || tagNameLower.includes(topicLower)) {
      return tag;
    }

    // Check synonyms
    for (const synonym of tagConfig.synonyms) {
      if (topicLower.includes(synonym) || synonym.includes(topicLower)) {
        return tag;
      }
    }
  }

  return undefined;
}

/**
 * Get emoji for a specific tag
 */
export function getTagEmoji(tagName: string, libraryType: LibraryType): string | undefined {
  const tag = LIBRARY_TAGS[libraryType].tags.find(
    (t) => t.name.toLowerCase() === tagName.toLowerCase()
  );
  return tag?.emoji;
}
