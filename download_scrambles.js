#!/usr/bin/env node
/**
 * Download cross trainer scrambles from SpeedCubeDB.
 * Fetches pre-computed scrambles for 1-7 move cross solutions.
 */

const LZString = require('lz-string');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://speedcubedb.com/cross/';

function formatScramble(compact) {
  // Add spaces between moves for readability
  return compact.replace(/([UDLRFB])(['2]?)(?=[UDLRFB]|$)/g, '$1$2 ').trim();
}

async function downloadScrambles(difficulty) {
  const url = `${BASE_URL}${difficulty}c.jlz`;
  console.log(`Downloading ${difficulty}-move cross scrambles from ${url}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const compressed = await response.text();
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

    if (!decompressed) {
      throw new Error('Decompression returned null');
    }

    const scrambles = JSON.parse(decompressed);
    console.log(`  Found ${scrambles.length.toLocaleString()} scrambles`);
    return scrambles;
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return [];
  }
}

async function main() {
  const outputDir = __dirname;
  const allScrambles = {};

  console.log('SpeedCubeDB Cross Trainer Scramble Downloader');
  console.log('='.repeat(50));

  // Download all difficulty levels
  for (let difficulty = 1; difficulty <= 7; difficulty++) {
    const scrambles = await downloadScrambles(difficulty);

    if (scrambles.length > 0) {
      allScrambles[`${difficulty}_move`] = scrambles;

      // Save individual file (formatted)
      const formatted = scrambles.map(formatScramble);
      const filename = path.join(outputDir, `cross_${difficulty}_move.json`);
      fs.writeFileSync(filename, JSON.stringify(formatted, null, 2));
      console.log(`  Saved to cross_${difficulty}_move.json`);
    }
  }

  // Save combined file
  const combined = {
    source: 'https://speedcubedb.com/cross/?trainer=cross',
    author: 'Gil Zussman',
    description: 'Pre-computed scrambles for cross trainer (1-7 move solutions)',
    scrambles: Object.fromEntries(
      Object.entries(allScrambles).map(([k, v]) => [k, v.map(formatScramble)])
    )
  };

  fs.writeFileSync(
    path.join(outputDir, 'all_cross_scrambles.json'),
    JSON.stringify(combined, null, 2)
  );

  console.log('\n' + '='.repeat(50));
  console.log(`Done! Saved all scrambles to ${outputDir}`);

  // Summary
  const total = Object.values(allScrambles).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nTotal scrambles downloaded: ${total.toLocaleString()}`);
  console.log('\nFiles created:');
  console.log('  - cross_1_move.json through cross_7_move.json (individual)');
  console.log('  - all_cross_scrambles.json (combined)');

  // Show sample
  if (total > 0) {
    console.log('\nSample scrambles:');
    for (const [key, scrambles] of Object.entries(allScrambles).slice(0, 3)) {
      console.log(`  ${key}: "${formatScramble(scrambles[0])}"`);
    }
  }
}

main().catch(console.error);
