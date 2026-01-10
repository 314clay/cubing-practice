const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/attempts - Record a single attempt
router.post('/', async (req, res) => {
  try {
    const {
      session_id,
      scramble,
      cross_moves,
      cross_color = 'white',
      pairs_attempted = 0,
      cross_success,
      pairs_planned = 0,
      inspection_time_ms,
      execution_time_ms,
      used_unlimited_time = false,
      blindfolded = false,
      notes
    } = req.body;

    // Validate required fields
    if (!scramble) {
      return res.status(400).json({
        error: {
          message: 'scramble is required',
          code: 'INVALID_PARAMS'
        }
      });
    }

    if (cross_moves === undefined || cross_moves < 1 || cross_moves > 7) {
      return res.status(400).json({
        error: {
          message: 'cross_moves is required (1-7)',
          code: 'INVALID_PARAMS'
        }
      });
    }

    const result = await db.query(
      `INSERT INTO cross_trainer.attempts (
         session_id,
         scramble,
         cross_moves,
         cross_color,
         pairs_attempted,
         cross_success,
         pairs_planned,
         inspection_time_ms,
         execution_time_ms,
         used_unlimited_time,
         blindfolded,
         notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, session_id, created_at`,
      [
        session_id,
        scramble,
        cross_moves,
        cross_color,
        pairs_attempted,
        cross_success,
        pairs_planned,
        inspection_time_ms,
        execution_time_ms,
        used_unlimited_time,
        blindfolded,
        notes
      ]
    );

    res.status(201).json({
      attempt: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating attempt:', err);

    if (err.code === '23503') {
      return res.status(400).json({
        error: {
          message: 'Invalid session_id',
          code: 'INVALID_REFERENCE'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Failed to create attempt',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/attempts - Query attempts with filters
router.get('/', async (req, res) => {
  try {
    const {
      session_id,
      cross_moves,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (session_id) {
      conditions.push(`session_id = $${paramIndex++}`);
      values.push(session_id);
    }

    if (cross_moves) {
      conditions.push(`cross_moves = $${paramIndex++}`);
      values.push(parseInt(cross_moves));
    }

    if (date_from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(date_from);
    }

    if (date_to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(date_to);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    values.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT *
       FROM cross_trainer.attempts
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    res.json({ attempts: result.rows });
  } catch (err) {
    console.error('Error listing attempts:', err);
    res.status(500).json({
      error: {
        message: 'Failed to list attempts',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// GET /api/attempts/:id - Get a single attempt
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM cross_trainer.attempts WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Attempt not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({ attempt: result.rows[0] });
  } catch (err) {
    console.error('Error getting attempt:', err);
    res.status(500).json({
      error: {
        message: 'Failed to get attempt',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// DELETE /api/attempts/:id - Delete an attempt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM cross_trainer.attempts WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Attempt not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting attempt:', err);
    res.status(500).json({
      error: {
        message: 'Failed to delete attempt',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

module.exports = router;
