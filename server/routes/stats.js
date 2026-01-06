const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats/summary - Get overall statistics
router.get('/summary', async (req, res) => {
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

    // Get overall stats
    const overallResult = await db.query(
      `SELECT
         COUNT(*) as total_attempts,
         COUNT(*) FILTER (WHERE cross_success = true) as successful,
         ROUND(100.0 * COUNT(*) FILTER (WHERE cross_success = true) / NULLIF(COUNT(*), 0), 1) as overall_cross_success_rate,
         AVG(inspection_time_ms) FILTER (WHERE inspection_time_ms IS NOT NULL) as avg_inspection_time_ms
       FROM cross_trainer.attempts
       WHERE 1=1 ${dateCondition}`,
      values
    );

    // Get stats by difficulty
    const byDifficultyResult = await db.query(
      `SELECT
         cross_moves,
         COUNT(*) as attempts,
         ROUND(100.0 * COUNT(*) FILTER (WHERE cross_success = true) / NULLIF(COUNT(*), 0), 1) as success_rate,
         AVG(inspection_time_ms) FILTER (WHERE inspection_time_ms IS NOT NULL) as avg_inspection_time_ms
       FROM cross_trainer.attempts
       WHERE 1=1 ${dateCondition}
       GROUP BY cross_moves
       ORDER BY cross_moves`,
      values
    );

    // Get stats by pairs attempted
    const byPairsResult = await db.query(
      `SELECT
         pairs_attempted,
         COUNT(*) as attempts,
         ROUND(100.0 * COUNT(*) FILTER (WHERE cross_success = true) / NULLIF(COUNT(*), 0), 1) as success_rate,
         AVG(inspection_time_ms) FILTER (WHERE inspection_time_ms IS NOT NULL) as avg_inspection_time_ms
       FROM cross_trainer.attempts
       WHERE 1=1 ${dateCondition}
       GROUP BY pairs_attempted
       ORDER BY pairs_attempted`,
      values
    );

    // Get session count
    const sessionsResult = await db.query(
      `SELECT COUNT(DISTINCT session_id) as total_sessions
       FROM cross_trainer.attempts
       WHERE session_id IS NOT NULL ${dateCondition}`,
      values
    );

    // Format by_difficulty as object
    const byDifficulty = {};
    byDifficultyResult.rows.forEach(row => {
      byDifficulty[row.cross_moves] = {
        attempts: parseInt(row.attempts),
        success_rate: parseFloat(row.success_rate) || 0,
        avg_inspection_time_ms: row.avg_inspection_time_ms
          ? Math.round(parseFloat(row.avg_inspection_time_ms))
          : null
      };
    });

    // Format by_pairs_attempted as object
    const byPairsAttempted = {};
    byPairsResult.rows.forEach(row => {
      byPairsAttempted[row.pairs_attempted] = {
        attempts: parseInt(row.attempts),
        success_rate: parseFloat(row.success_rate) || 0,
        avg_inspection_time_ms: row.avg_inspection_time_ms
          ? Math.round(parseFloat(row.avg_inspection_time_ms))
          : null
      };
    });

    const overall = overallResult.rows[0];

    res.json({
      total_attempts: parseInt(overall.total_attempts),
      total_sessions: parseInt(sessionsResult.rows[0].total_sessions),
      overall_cross_success_rate: parseFloat(overall.overall_cross_success_rate) || 0,
      by_difficulty: byDifficulty,
      by_pairs_attempted: byPairsAttempted,
      avg_inspection_time_ms: overall.avg_inspection_time_ms
        ? Math.round(parseFloat(overall.avg_inspection_time_ms))
        : null
    });
  } catch (err) {
    console.error('Error getting stats summary:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get stats summary',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/stats/daily - Get daily breakdown for charts
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as attempts,
         ROUND(100.0 * COUNT(*) FILTER (WHERE cross_success = true) / NULLIF(COUNT(*), 0), 1) as success_rate,
         ROUND(AVG(cross_moves), 1) as avg_difficulty,
         ROUND(AVG(pairs_attempted), 1) as avg_pairs_attempted,
         AVG(inspection_time_ms) FILTER (WHERE inspection_time_ms IS NOT NULL) as avg_inspection_time_ms
       FROM cross_trainer.attempts
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) DESC`,
      [days]
    );

    res.json({
      daily: result.rows.map(row => ({
        date: row.date,
        attempts: parseInt(row.attempts),
        success_rate: parseFloat(row.success_rate) || 0,
        avg_difficulty: parseFloat(row.avg_difficulty) || 0,
        avg_pairs_attempted: parseFloat(row.avg_pairs_attempted) || 0,
        avg_inspection_time_ms: row.avg_inspection_time_ms
          ? Math.round(parseFloat(row.avg_inspection_time_ms))
          : null
      }))
    });
  } catch (err) {
    console.error('Error getting daily stats:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get daily stats',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/stats/time-by-difficulty - Get inspection times by difficulty and success/failure
router.get('/time-by-difficulty', async (req, res) => {
  try {
    const { date_from } = req.query;

    let dateCondition = '';
    const values = [];

    if (date_from) {
      dateCondition = ' AND created_at >= $1';
      values.push(date_from);
    }

    const result = await db.query(
      `SELECT
         cross_moves,
         cross_success,
         AVG(inspection_time_ms) as avg_time_ms,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY inspection_time_ms) as median_time_ms,
         COUNT(*) as count
       FROM cross_trainer.attempts
       WHERE inspection_time_ms IS NOT NULL ${dateCondition}
       GROUP BY cross_moves, cross_success
       ORDER BY cross_moves, cross_success DESC`,
      values
    );

    // Format data for charting - group by difficulty
    const byDifficulty = {};
    result.rows.forEach(row => {
      const moves = row.cross_moves;
      if (!byDifficulty[moves]) {
        byDifficulty[moves] = { cross_moves: moves };
      }
      const key = row.cross_success ? 'success' : 'fail';
      byDifficulty[moves][`${key}_avg_ms`] = Math.round(parseFloat(row.avg_time_ms));
      byDifficulty[moves][`${key}_median_ms`] = Math.round(parseFloat(row.median_time_ms));
      byDifficulty[moves][`${key}_count`] = parseInt(row.count);
    });

    res.json({
      data: Object.values(byDifficulty).sort((a, b) => a.cross_moves - b.cross_moves)
    });
  } catch (err) {
    console.error('Error getting time by difficulty:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get time by difficulty',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/stats/recent-notes - Get recent attempts with notes
router.get('/recent-notes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await db.query(
      `SELECT
         id,
         scramble,
         cross_moves,
         cross_color,
         pairs_attempted,
         cross_success,
         pairs_planned,
         notes,
         created_at
       FROM cross_trainer.attempts
       WHERE notes IS NOT NULL AND notes != ''
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ attempts: result.rows });
  } catch (err) {
    console.error('Error getting recent notes:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get recent notes',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/stats/attempts-scatter - Get individual attempts for scatter plot visualization
router.get('/attempts-scatter', async (req, res) => {
  try {
    const { date_from, limit = 500 } = req.query;

    let dateCondition = '';
    const values = [];
    let paramIndex = 1;

    if (date_from) {
      dateCondition = ` AND created_at >= $${paramIndex++}`;
      values.push(date_from);
    }

    values.push(parseInt(limit, 10));

    const result = await db.query(
      `SELECT
         id,
         created_at,
         inspection_time_ms,
         cross_moves,
         pairs_attempted,
         cross_success,
         notes
       FROM cross_trainer.attempts
       WHERE inspection_time_ms IS NOT NULL ${dateCondition}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
      values
    );

    res.json({
      attempts: result.rows.map(row => ({
        id: row.id,
        created_at: row.created_at,
        inspection_time_ms: parseInt(row.inspection_time_ms),
        cross_moves: row.cross_moves,
        pairs_attempted: row.pairs_attempted,
        cross_success: row.cross_success,
        notes: row.notes
      }))
    });
  } catch (err) {
    console.error('Error getting attempts scatter data:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get attempts scatter data',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

module.exports = router;
