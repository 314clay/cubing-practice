const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/zbll/stats - Get ZBLL practice statistics
router.get('/stats', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let dateCondition = '';
    const values = [];
    let paramIndex = 1;

    if (date_from) {
      dateCondition += ` AND created_at >= $${paramIndex++}`;
      values.push(date_from);
    }
    if (date_to) {
      dateCondition += ` AND created_at <= $${paramIndex++}`;
      values.push(date_to);
    }

    // Overall stats
    const overallResult = await db.query(
      `SELECT
         COUNT(*) as total_solves,
         ROUND(AVG(time_ms)) as avg_ms,
         MIN(time_ms) as best_ms,
         MAX(time_ms) as worst_ms,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_ms) as median_ms,
         COUNT(DISTINCT case_key) as unique_cases,
         COUNT(DISTINCT zbll_set) as sets_practiced
       FROM cubing.zbll_practice
       WHERE 1=1 ${dateCondition}`,
      values
    );

    // Stats by ZBLL set
    const bySetResult = await db.query(
      `SELECT
         zbll_set,
         COUNT(*) as count,
         ROUND(AVG(time_ms)) as avg_ms,
         MIN(time_ms) as best_ms,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_ms) as median_ms
       FROM cubing.zbll_practice
       WHERE 1=1 ${dateCondition}
       GROUP BY zbll_set
       ORDER BY zbll_set`,
      values
    );

    const overall = overallResult.rows[0];

    res.json({
      total_solves: parseInt(overall.total_solves) || 0,
      avg_ms: parseInt(overall.avg_ms) || 0,
      best_ms: parseInt(overall.best_ms) || 0,
      worst_ms: parseInt(overall.worst_ms) || 0,
      median_ms: parseInt(overall.median_ms) || 0,
      unique_cases: parseInt(overall.unique_cases) || 0,
      sets_practiced: parseInt(overall.sets_practiced) || 0,
      by_set: bySetResult.rows.map(row => ({
        zbll_set: row.zbll_set,
        count: parseInt(row.count),
        avg_ms: parseInt(row.avg_ms),
        best_ms: parseInt(row.best_ms),
        median_ms: parseInt(row.median_ms),
      })),
    });
  } catch (err) {
    console.error('Error getting ZBLL stats:', err);
    res.status(500).json({ error: { message: 'Failed to get ZBLL stats' } });
  }
});

// GET /api/zbll/daily - Daily ZBLL practice breakdown
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as solves,
         ROUND(AVG(time_ms)) as avg_ms,
         MIN(time_ms) as best_ms
       FROM cubing.zbll_practice
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) DESC`,
      [days]
    );

    res.json({
      daily: result.rows.map(row => ({
        date: row.date,
        solves: parseInt(row.solves),
        avg_ms: parseInt(row.avg_ms),
        best_ms: parseInt(row.best_ms),
      })),
    });
  } catch (err) {
    console.error('Error getting ZBLL daily stats:', err);
    res.status(500).json({ error: { message: 'Failed to get ZBLL daily stats' } });
  }
});

// GET /api/zbll/cases - Stats by individual case
router.get('/cases', async (req, res) => {
  try {
    const { sort = 'avg_ms', order = 'desc', min_solves = 3, limit = 20 } = req.query;

    const validSorts = ['avg_ms', 'count', 'best_ms', 'case_key'];
    const sortCol = validSorts.includes(sort) ? sort : 'avg_ms';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const result = await db.query(
      `SELECT
         case_key,
         zbll_set,
         COUNT(*) as count,
         ROUND(AVG(time_ms)) as avg_ms,
         MIN(time_ms) as best_ms,
         MAX(time_ms) as worst_ms
       FROM cubing.zbll_practice
       GROUP BY case_key, zbll_set
       HAVING COUNT(*) >= $1
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $2`,
      [parseInt(min_solves), parseInt(limit)]
    );

    res.json({
      cases: result.rows.map(row => ({
        case_key: row.case_key,
        zbll_set: row.zbll_set,
        count: parseInt(row.count),
        avg_ms: parseInt(row.avg_ms),
        best_ms: parseInt(row.best_ms),
        worst_ms: parseInt(row.worst_ms),
      })),
    });
  } catch (err) {
    console.error('Error getting ZBLL cases:', err);
    res.status(500).json({ error: { message: 'Failed to get ZBLL cases' } });
  }
});

// GET /api/zbll/recent - Recent solves
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await db.query(
      `SELECT
         id,
         case_key,
         zbll_set,
         scramble,
         time_ms,
         created_at
       FROM cubing.zbll_practice
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ solves: result.rows });
  } catch (err) {
    console.error('Error getting recent ZBLL solves:', err);
    res.status(500).json({ error: { message: 'Failed to get recent solves' } });
  }
});

// GET /api/zbll/progress - Progress over time (rolling averages)
router.get('/progress', async (req, res) => {
  try {
    const result = await db.query(
      `WITH numbered AS (
         SELECT
           time_ms,
           created_at,
           ROW_NUMBER() OVER (ORDER BY created_at) as rn
         FROM cubing.zbll_practice
       )
       SELECT
         rn as solve_num,
         time_ms,
         created_at,
         AVG(time_ms) OVER (ORDER BY rn ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as rolling_avg_50,
         AVG(time_ms) OVER (ORDER BY rn ROWS BETWEEN 99 PRECEDING AND CURRENT ROW) as rolling_avg_100
       FROM numbered
       WHERE rn % 10 = 0 OR rn <= 100
       ORDER BY rn`
    );

    res.json({
      progress: result.rows.map(row => ({
        solve_num: parseInt(row.solve_num),
        time_ms: parseInt(row.time_ms),
        created_at: row.created_at,
        rolling_avg_50: Math.round(parseFloat(row.rolling_avg_50)),
        rolling_avg_100: Math.round(parseFloat(row.rolling_avg_100)),
      })),
    });
  } catch (err) {
    console.error('Error getting ZBLL progress:', err);
    res.status(500).json({ error: { message: 'Failed to get ZBLL progress' } });
  }
});

module.exports = router;
