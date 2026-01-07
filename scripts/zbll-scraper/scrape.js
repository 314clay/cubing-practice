#!/usr/bin/env node
/**
 * ZBLL Stats Scraper
 *
 * Extracts practice statistics from bestsiteever.net/zbll using Puppeteer.
 *
 * Usage:
 *   node scrape.js                    # Export to ./exports/
 *   node scrape.js --output stats.json  # Export to specific file
 *   node scrape.js --profile "Profile 1" # Use specific Chrome profile
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZBLL_URL = 'https://bestsiteever.net/zbll/#/timer';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const outputFile = getArg('--output');
const chromeProfile = getArg('--profile');
const headless = !args.includes('--visible');

async function scrapeZBLLStats() {
  console.log('Starting ZBLL stats scraper...');

  // Launch browser
  const launchOptions = {
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };

  // If using a Chrome profile (to get your existing localStorage)
  if (chromeProfile) {
    const userDataDir = process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support/Google/Chrome`
      : process.platform === 'win32'
        ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data`
        : `${process.env.HOME}/.config/google-chrome`;

    launchOptions.userDataDir = userDataDir;
    launchOptions.args.push(`--profile-directory=${chromeProfile}`);
    console.log(`Using Chrome profile: ${chromeProfile}`);
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    console.log(`Navigating to ${ZBLL_URL}...`);
    await page.goto(ZBLL_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for Vue to hydrate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract localStorage data
    const data = await page.evaluate(() => {
      const stats = JSON.parse(localStorage.getItem('zbll_stats_array') || '[]');
      const store = JSON.parse(localStorage.getItem('zbll_store') || '{}');
      const settings = JSON.parse(localStorage.getItem('zbllTrainerSettings') || '{}');

      return {
        stats,
        store,
        settings,
        exportedAt: new Date().toISOString(),
        source: 'bestsiteever.net/zbll',
        totalSolves: stats.length,
        summary: stats.length > 0 ? {
          avgMs: Math.round(stats.reduce((sum, s) => sum + s.ms, 0) / stats.length),
          bestMs: Math.min(...stats.map(s => s.ms)),
          worstMs: Math.max(...stats.map(s => s.ms)),
          uniqueCases: [...new Set(stats.map(s => s.key))].length,
        } : null,
      };
    });

    console.log(`Found ${data.totalSolves} solves`);

    if (data.summary) {
      console.log(`Average: ${(data.summary.avgMs / 1000).toFixed(2)}s`);
      console.log(`Best: ${(data.summary.bestMs / 1000).toFixed(2)}s`);
      console.log(`Unique cases: ${data.summary.uniqueCases}`);
    }

    // Determine output path
    let outputPath;
    if (outputFile) {
      outputPath = path.resolve(outputFile);
    } else {
      const exportDir = path.join(__dirname, 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = path.join(exportDir, `zbll-stats-${timestamp}.json`);
    }

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Exported to: ${outputPath}`);

    return data;

  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeZBLLStats().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
