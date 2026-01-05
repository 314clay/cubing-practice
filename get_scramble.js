#!/usr/bin/env node
/**
 * Simple CLI to get a random cross scramble.
 *
 * Usage:
 *   node get_scramble.js           # Random difficulty
 *   node get_scramble.js 3         # 3-move cross
 *   node get_scramble.js 5 10      # 10 scrambles for 5-move cross
 */

const fs = require('fs');
const path = require('path');

function getScramble(difficulty, count = 1) {
  const file = path.join(__dirname, `cross_${difficulty}_move.json`);

  if (!fs.existsSync(file)) {
    console.error(`No data for ${difficulty}-move cross. Run download_scrambles.js first.`);
    process.exit(1);
  }

  const scrambles = JSON.parse(fs.readFileSync(file, 'utf8'));
  const results = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * scrambles.length);
    results.push(scrambles[idx]);
  }

  return results;
}

// Parse CLI args
const args = process.argv.slice(2);
const difficulty = args[0] ? parseInt(args[0]) : Math.floor(Math.random() * 7) + 1;
const count = args[1] ? parseInt(args[1]) : 1;

if (difficulty < 1 || difficulty > 7) {
  console.error('Difficulty must be 1-7');
  process.exit(1);
}

const scrambles = getScramble(difficulty, count);

console.log(`${difficulty}-move cross scramble${count > 1 ? 's' : ''}:\n`);
scrambles.forEach((s, i) => {
  if (count > 1) {
    console.log(`${i + 1}. ${s}`);
  } else {
    console.log(s);
  }
});
