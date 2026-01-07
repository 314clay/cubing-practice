#!/usr/bin/env node
/**
 * ZBLL Stats Analyzer
 *
 * Analyzes exported ZBLL practice data and generates insights.
 *
 * Usage:
 *   node analyze.js stats.json
 *   node analyze.js exports/zbll-stats-2024-01-15.json
 */

import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: node analyze.js <stats-file.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const stats = data.stats || [];

if (stats.length === 0) {
  console.log('No solves found in the data file.');
  process.exit(0);
}

// Parse case key into components
function parseKey(key) {
  const parts = key.split('-');
  return {
    set: parts[0],       // T, U, L, H, Pi, S, AS
    subcat: parts[1],    // Subcategory index
    case: parts[2],      // Case number within subcategory
  };
}

// Format milliseconds to readable time
function formatTime(ms) {
  return (ms / 1000).toFixed(2) + 's';
}

// Calculate statistics for an array of times
function calcStats(times) {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  return {
    count: times.length,
    avg: sum / times.length,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    ao5: times.length >= 5 ? calcAoN(sorted, 5) : null,
    ao12: times.length >= 12 ? calcAoN(sorted, 12) : null,
  };
}

// Calculate Average of N (remove best and worst)
function calcAoN(sortedTimes, n) {
  const recent = sortedTimes.slice(-n);
  const trimmed = recent.slice(1, -1); // Remove best and worst
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('                    ZBLL PRACTICE ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

// Overall stats
const allTimes = stats.map(s => s.ms);
const overall = calcStats(allTimes);

console.log('OVERALL STATISTICS');
console.log('───────────────────────────────────────────────────────────────');
console.log(`Total solves:    ${overall.count}`);
console.log(`Average:         ${formatTime(overall.avg)}`);
console.log(`Best:            ${formatTime(overall.best)}`);
console.log(`Worst:           ${formatTime(overall.worst)}`);
console.log(`Median:          ${formatTime(overall.median)}`);
if (overall.ao5) console.log(`Ao5:             ${formatTime(overall.ao5)}`);
if (overall.ao12) console.log(`Ao12:            ${formatTime(overall.ao12)}`);
console.log();

// Stats by ZBLL set
console.log('BY ZBLL SET');
console.log('───────────────────────────────────────────────────────────────');

const bySet = {};
stats.forEach(s => {
  const { set } = parseKey(s.key);
  if (!bySet[set]) bySet[set] = [];
  bySet[set].push(s.ms);
});

const setOrder = ['T', 'U', 'L', 'H', 'Pi', 'S', 'AS'];
setOrder.forEach(set => {
  if (bySet[set]) {
    const setStats = calcStats(bySet[set]);
    console.log(`${set.padEnd(4)} │ ${setStats.count.toString().padStart(4)} solves │ avg: ${formatTime(setStats.avg).padStart(7)} │ best: ${formatTime(setStats.best).padStart(7)}`);
  }
});
console.log();

// Stats by individual case
const byCase = {};
stats.forEach(s => {
  if (!byCase[s.key]) byCase[s.key] = [];
  byCase[s.key].push(s.ms);
});

// Find weakest cases (slowest average)
console.log('WEAKEST CASES (Top 10 Slowest)');
console.log('───────────────────────────────────────────────────────────────');

const caseAvgs = Object.entries(byCase)
  .filter(([_, times]) => times.length >= 3) // At least 3 solves
  .map(([key, times]) => ({
    key,
    ...calcStats(times),
  }))
  .sort((a, b) => b.avg - a.avg);

caseAvgs.slice(0, 10).forEach((c, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${c.key.padEnd(10)} │ avg: ${formatTime(c.avg).padStart(7)} │ ${c.count} solves`);
});
console.log();

// Find strongest cases
console.log('STRONGEST CASES (Top 10 Fastest)');
console.log('───────────────────────────────────────────────────────────────');

caseAvgs.slice(-10).reverse().forEach((c, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${c.key.padEnd(10)} │ avg: ${formatTime(c.avg).padStart(7)} │ ${c.count} solves`);
});
console.log();

// Most practiced cases
console.log('MOST PRACTICED CASES');
console.log('───────────────────────────────────────────────────────────────');

const byPractice = Object.entries(byCase)
  .map(([key, times]) => ({ key, count: times.length }))
  .sort((a, b) => b.count - a.count);

byPractice.slice(0, 10).forEach((c, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${c.key.padEnd(10)} │ ${c.count} solves`);
});
console.log();

// Progress over time (if we have enough data)
if (stats.length >= 20) {
  console.log('PROGRESS OVER TIME');
  console.log('───────────────────────────────────────────────────────────────');

  const chunkSize = Math.floor(stats.length / 4);
  const quarters = [
    stats.slice(0, chunkSize),
    stats.slice(chunkSize, chunkSize * 2),
    stats.slice(chunkSize * 2, chunkSize * 3),
    stats.slice(chunkSize * 3),
  ];

  quarters.forEach((q, i) => {
    const qStats = calcStats(q.map(s => s.ms));
    const labels = ['First 25%', 'Second 25%', 'Third 25%', 'Last 25%'];
    console.log(`${labels[i].padEnd(12)} │ avg: ${formatTime(qStats.avg).padStart(7)} │ ${qStats.count} solves`);
  });

  const firstAvg = calcStats(quarters[0].map(s => s.ms)).avg;
  const lastAvg = calcStats(quarters[3].map(s => s.ms)).avg;
  const improvement = ((firstAvg - lastAvg) / firstAvg) * 100;

  console.log();
  if (improvement > 0) {
    console.log(`Improvement: ${improvement.toFixed(1)}% faster from start to now`);
  } else {
    console.log(`Change: ${Math.abs(improvement).toFixed(1)}% slower from start to now`);
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
