#!/usr/bin/env bun

/**
 * Test YouTube Extraction
 * Quick test to verify YouTube content extraction is working
 */

import { youtubeExtractor } from '../services/content/youtube-extractor.js';

const testUrl = 'https://youtu.be/EKOU3JWDNLI?si=eTPe6Ye_o7TnMvoh';

console.log('Testing YouTube extraction...');
console.log(`URL: ${testUrl}\n`);

try {
  const result = await youtubeExtractor.extract(testUrl);

  console.log('✅ Extraction successful!');
  console.log('\n📊 Results:');
  console.log('─'.repeat(50));
  console.log(`Title: ${result.title}`);
  console.log(`Type: ${result.type}`);
  console.log(`Content length: ${result.content.length} characters`);
  console.log(`\nMetadata:`);
  console.log(`  Author: ${result.metadata.author || 'N/A'}`);
  console.log(`  Channel: ${result.metadata.channelName || 'N/A'}`);
  console.log(`  Duration: ${result.metadata.duration || 'N/A'}`);
  console.log(`  Views: ${result.metadata.viewCount || 'N/A'}`);
  console.log(`  Thumbnail: ${result.metadata.thumbnail ? 'Yes' : 'No'}`);
  console.log(`  Transcribed: ${result.metadata.transcribed ? 'Yes' : 'No'}`);

  if (result.metadata.description) {
    console.log(`\nDescription (first 200 chars):`);
    console.log(result.metadata.description.substring(0, 200) + '...');
  }

  console.log(`\nContent (first 300 chars):`);
  console.log(result.content.substring(0, 300) + '...');
} catch (error) {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
}
