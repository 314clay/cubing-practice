#!/usr/bin/env node
/**
 * ZBLL Stats Receiver Server
 *
 * Receives stats from Chrome extension and stores to Postgres.
 *
 * Usage:
 *   node server.js                    # Run on default port 3847
 *   node server.js --port 8080        # Custom port
 */

import http from 'http';
import pg from 'pg';

const { Pool } = pg;

// Parse args
const args = process.argv.slice(2);
const getArg = (flag, defaultVal) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : defaultVal;
};

const PORT = parseInt(getArg('--port', '3847'));

// Postgres connection
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'connectingservices',
  user: process.env.USER,
});

// Track what we've already inserted (by source_index) to avoid duplicates
let lastSyncedIndex = -1;

async function initLastSyncedIndex() {
  try {
    const result = await pool.query(
      'SELECT COALESCE(MAX(source_index), -1) as max_idx FROM cubing.zbll_practice'
    );
    lastSyncedIndex = result.rows[0].max_idx;
    console.log(`Last synced index: ${lastSyncedIndex}`);
  } catch (err) {
    console.error('Error getting last synced index:', err.message);
  }
}

function parseKey(key) {
  // Parse "T-1-3" into { set: "T", subcategory: 1, caseNum: 3 }
  const parts = key.split('-');
  return {
    set: parts[0],
    subcategory: parseInt(parts[1]) || 0,
    caseNum: parseInt(parts[2]) || 0,
  };
}

async function handleStats(data) {
  const stats = data.stats || [];
  const sessionId = data.sessionId || null;

  // Filter to only new solves
  const newSolves = stats.filter(s => s.i > lastSyncedIndex);

  if (newSolves.length === 0) {
    console.log(`[${new Date().toLocaleTimeString()}] No new solves to sync`);
    return { success: true, inserted: 0, total: stats.length };
  }

  console.log(`[${new Date().toLocaleTimeString()}] Inserting ${newSolves.length} new solves...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const solve of newSolves) {
      const { set, subcategory, caseNum } = parseKey(solve.key);

      await client.query(
        `INSERT INTO cubing.zbll_practice
         (case_key, zbll_set, subcategory, case_num, scramble, time_ms, source_index, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [solve.key, set, subcategory, caseNum, solve.scramble, solve.ms, solve.i, sessionId]
      );
    }

    await client.query('COMMIT');

    // Update last synced index
    const maxIndex = Math.max(...newSolves.map(s => s.i));
    lastSyncedIndex = Math.max(lastSyncedIndex, maxIndex);

    console.log(`  Inserted ${newSolves.length} solves (total in DB: ${lastSyncedIndex + 1})`);

    if (data.summary) {
      console.log(`  Session avg: ${(data.summary.avgMs / 1000).toFixed(2)}s | Best: ${(data.summary.bestMs / 1000).toFixed(2)}s`);
    }

    return { success: true, inserted: newSolves.length, total: stats.length };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_solves,
      ROUND(AVG(time_ms)) as avg_ms,
      MIN(time_ms) as best_ms,
      MAX(time_ms) as worst_ms,
      COUNT(DISTINCT case_key) as unique_cases,
      COUNT(DISTINCT zbll_set) as sets_practiced
    FROM cubing.zbll_practice
  `);

  const bySet = await pool.query(`
    SELECT
      zbll_set,
      COUNT(*) as count,
      ROUND(AVG(time_ms)) as avg_ms,
      MIN(time_ms) as best_ms
    FROM cubing.zbll_practice
    GROUP BY zbll_set
    ORDER BY zbll_set
  `);

  const recentSolves = await pool.query(`
    SELECT case_key, time_ms, created_at
    FROM cubing.zbll_practice
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return {
    summary: result.rows[0],
    bySet: bySet.rows,
    recentSolves: recentSolves.rows,
  };
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/zbll-stats') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await handleStats(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Error processing stats:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/zbll-stats') {
    try {
      const stats = await getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT, lastSyncedIndex }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// Initialize and start
initLastSyncedIndex().then(() => {
  server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           ZBLL Stats Server (Postgres)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Listening on http://localhost:${PORT}`);
    console.log(`Database: connectingservices @ localhost:5433`);
    console.log(`Table: cubing.zbll_practice`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  POST /zbll-stats  - Receive stats from extension`);
    console.log(`  GET  /zbll-stats  - Get stats summary from DB`);
    console.log(`  GET  /health      - Health check`);
    console.log('');
    console.log('Waiting for stats from Chrome extension...');
    console.log('═══════════════════════════════════════════════════════════');
  });
});
