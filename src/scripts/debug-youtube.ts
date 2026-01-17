#!/usr/bin/env bun

/**
 * Debug YouTube Extraction
 * Detailed debugging to see what's in the info object
 */

import { Innertube } from 'youtubei.js';

const testUrl = 'https://youtu.be/EKOU3JWDNLI?si=eTPe6Ye_o7TnMvoh';
const videoId = 'EKOU3JWDNLI';

console.log('Testing YouTube extraction with debugging...');
console.log(`URL: ${testUrl}\n`);

try {
  const client = await Innertube.create();
  const info = await client.getInfo(videoId);

  console.log('✅ Successfully fetched video info\n');
  console.log('📊 Raw basic_info object:');
  console.log(JSON.stringify(info.basic_info, null, 2));

  console.log('\n📋 Specific fields:');
  console.log(`  title: ${info.basic_info.title}`);
  console.log(`  author: ${info.basic_info.author}`);
  console.log(`  channel: ${JSON.stringify(info.basic_info.channel)}`);
  console.log(`  duration: ${info.basic_info.duration}`);
  console.log(`  view_count: ${info.basic_info.view_count}`);
  console.log(`  short_description: ${info.basic_info.short_description?.substring(0, 100)}`);
  console.log(`  thumbnail: ${info.basic_info.thumbnail?.[0]?.url}`);
} catch (error) {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
}
