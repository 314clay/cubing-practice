const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sm2, calculateRetentionRate } = require('../services/sm2');
const { parseReconstruction, getSolutionAtDepth, generateAlgCubingUrl } = require('../services/reconstruction');

// GET /api/srs/due - Get items due for review
router.get('/due', async (req, res) => {
  try {
    const { depth, limit = 10 } = req.query;

    let query = `
      SELECT
        si.id,
        si.solve_id,
        si.depth,
        si.ease_factor,
        si.interval_days,
        si.repetitions,
        si.next_review_at,
        si.notes as item_notes,
        s.scramble,
        s.solver,
        s.result,
        s.competition,
        s.solve_date
      FROM cross_trainer.srs_items si
      JOIN cubing.solves s ON s.id = si.solve_id
      WHERE si.next_review_at <= NOW()
        AND si.is_active = true
    `;

    const params = [];
    if (depth !== undefined) {
      params.push(parseInt(depth, 10));
      query += ` AND si.depth = $${params.length}`;
    }

    query += ` ORDER BY si.next_review_at ASC`;
    params.push(parseInt(limit, 10));
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    // Get total due count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cross_trainer.srs_items
      WHERE next_review_at <= NOW()
        AND is_active = true
    `;
    const countParams = [];
    if (depth !== undefined) {
      countParams.push(parseInt(depth, 10));
      countQuery += ` AND depth = $${countParams.length}`;
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      items: result.rows,
      total_due: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error fetching due items:', err);
    res.status(500).json({ error: { message: 'Failed to fetch due items', code: 'INTERNAL_ERROR' } });
  }
});

// POST /api/srs/review - Record a review
router.post('/review', async (req, res) => {
  try {
    const { srs_item_id, quality, response_time_ms, user_solution, notes } = req.body;

    if (srs_item_id === undefined || quality === undefined) {
      return res.status(400).json({ error: { message: 'srs_item_id and quality are required', code: 'VALIDATION_ERROR' } });
    }

    if (quality < 0 || quality > 5) {
      return res.status(400).json({ error: { message: 'quality must be between 0 and 5', code: 'VALIDATION_ERROR' } });
    }

    // Get current item state
    const itemResult = await pool.query(
      'SELECT * FROM cross_trainer.srs_items WHERE id = $1',
      [srs_item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'SRS item not found', code: 'NOT_FOUND' } });
    }

    const item = itemResult.rows[0];
    const newState = sm2(item, quality);

    // Update item with new SRS state
    const updateResult = await pool.query(
      `UPDATE cross_trainer.srs_items
       SET ease_factor = $1,
           interval_days = $2,
           repetitions = $3,
           next_review_at = $4,
           last_reviewed_at = NOW(),
           times_correct = times_correct + $5,
           times_incorrect = times_incorrect + $6
       WHERE id = $7
       RETURNING *`,
      [
        newState.easeFactor,
        newState.interval,
        newState.repetitions,
        newState.nextReviewAt,
        newState.passed ? 1 : 0,
        newState.passed ? 0 : 1,
        srs_item_id,
      ]
    );

    // Record the review
    await pool.query(
      `INSERT INTO cross_trainer.srs_reviews (srs_item_id, quality, response_time_ms, user_solution, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [srs_item_id, quality, response_time_ms, user_solution, notes]
    );

    res.json({
      item: {
        id: srs_item_id,
        next_review_at: updateResult.rows[0].next_review_at,
        interval_days: updateResult.rows[0].interval_days,
        ease_factor: updateResult.rows[0].ease_factor,
        repetitions: updateResult.rows[0].repetitions,
      },
    });
  } catch (err) {
    console.error('Error recording review:', err);
    res.status(500).json({ error: { message: 'Failed to record review', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/srs/item/:id/solution - Get solution at depth
router.get('/item/:id/solution', async (req, res) => {
  try {
    const { id } = req.params;
    const { depth = 0 } = req.query;

    const itemResult = await pool.query(
      `SELECT si.*, s.scramble, s.reconstruction, s.solver, s.result, s.competition
       FROM cross_trainer.srs_items si
       JOIN cubing.solves s ON s.id = si.solve_id
       WHERE si.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'SRS item not found', code: 'NOT_FOUND' } });
    }

    const item = itemResult.rows[0];
    const segments = parseReconstruction(item.reconstruction);
    const solution = getSolutionAtDepth(segments, parseInt(depth, 10));

    res.json({
      solve_id: item.solve_id,
      solver: item.solver,
      result: item.result,
      segments: segments,
      moves_at_depth: solution.moves,
      move_count: solution.moveCount,
      segments_shown: solution.segmentsShown,
      alg_cubing_url: generateAlgCubingUrl(item.scramble, solution.moves),
    });
  } catch (err) {
    console.error('Error fetching solution:', err);
    res.status(500).json({ error: { message: 'Failed to fetch solution', code: 'INTERNAL_ERROR' } });
  }
});

// POST /api/srs/add - Add solve to SRS
router.post('/add', async (req, res) => {
  try {
    const { solve_id, depth, notes } = req.body;

    if (solve_id === undefined || depth === undefined) {
      return res.status(400).json({ error: { message: 'solve_id and depth are required', code: 'VALIDATION_ERROR' } });
    }

    if (depth < 0 || depth > 3) {
      return res.status(400).json({ error: { message: 'depth must be between 0 and 3', code: 'VALIDATION_ERROR' } });
    }

    // Check if solve exists
    const solveResult = await pool.query('SELECT id FROM cubing.solves WHERE id = $1', [solve_id]);
    if (solveResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Solve not found', code: 'NOT_FOUND' } });
    }

    // Insert new SRS item (will fail if already exists due to UNIQUE constraint)
    const result = await pool.query(
      `INSERT INTO cross_trainer.srs_items (solve_id, depth, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [solve_id, depth, notes]
    );

    res.json({ item: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation
      return res.status(409).json({ error: { message: 'This solve is already in SRS at this depth', code: 'DUPLICATE' } });
    }
    console.error('Error adding to SRS:', err);
    res.status(500).json({ error: { message: 'Failed to add to SRS', code: 'INTERNAL_ERROR' } });
  }
});

// DELETE /api/srs/item/:id - Remove from SRS
router.delete('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM cross_trainer.srs_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'SRS item not found', code: 'NOT_FOUND' } });
    }

    res.json({ success: true, deleted_id: parseInt(id, 10) });
  } catch (err) {
    console.error('Error removing from SRS:', err);
    res.status(500).json({ error: { message: 'Failed to remove from SRS', code: 'INTERNAL_ERROR' } });
  }
});

// DELETE /api/srs/solve/:solveId/depth/:depth - Remove by solve_id and depth
router.delete('/solve/:solveId/depth/:depth', async (req, res) => {
  try {
    const { solveId, depth } = req.params;

    const result = await pool.query(
      'DELETE FROM cross_trainer.srs_items WHERE solve_id = $1 AND depth = $2 RETURNING id',
      [solveId, depth]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'SRS item not found', code: 'NOT_FOUND' } });
    }

    res.json({ success: true, deleted_id: result.rows[0].id });
  } catch (err) {
    console.error('Error removing from SRS:', err);
    res.status(500).json({ error: { message: 'Failed to remove from SRS', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/srs/stats - SRS statistics
router.get('/stats', async (req, res) => {
  try {
    // Total items (active only)
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM cross_trainer.srs_items WHERE is_active = true');

    // Due today (active only)
    const dueResult = await pool.query(
      'SELECT COUNT(*) as due FROM cross_trainer.srs_items WHERE next_review_at <= NOW() AND is_active = true'
    );

    // By depth (active only)
    const byDepthResult = await pool.query(
      `SELECT
         depth,
         COUNT(*) as items,
         AVG(ease_factor) as avg_ease
       FROM cross_trainer.srs_items
       WHERE is_active = true
       GROUP BY depth
       ORDER BY depth`
    );

    // Reviews last 7 days
    const reviewsResult = await pool.query(
      `SELECT COUNT(*) as reviews
       FROM cross_trainer.srs_reviews
       WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    // Retention rate (last 7 days)
    const retentionResult = await pool.query(
      `SELECT quality FROM cross_trainer.srs_reviews WHERE created_at >= NOW() - INTERVAL '7 days'`
    );

    const byDepth = {};
    for (const row of byDepthResult.rows) {
      byDepth[row.depth] = {
        items: parseInt(row.items, 10),
        avg_ease: parseFloat(row.avg_ease) || 2.5,
      };
    }

    res.json({
      total_items: parseInt(totalResult.rows[0].total, 10),
      due_today: parseInt(dueResult.rows[0].due, 10),
      by_depth: byDepth,
      reviews_last_7_days: parseInt(reviewsResult.rows[0].reviews, 10),
      retention_rate: calculateRetentionRate(retentionResult.rows),
    });
  } catch (err) {
    console.error('Error fetching SRS stats:', err);
    res.status(500).json({ error: { message: 'Failed to fetch SRS stats', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/srs/items - List all SRS items for management
router.get('/items', async (req, res) => {
  try {
    const { active_only, depth, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        si.id,
        si.solve_id,
        si.depth,
        si.ease_factor,
        si.interval_days,
        si.repetitions,
        si.next_review_at,
        si.last_reviewed_at,
        si.times_correct,
        si.times_incorrect,
        si.is_active,
        si.notes as item_notes,
        si.created_at,
        s.scramble,
        s.solver,
        s.result,
        s.competition
      FROM cross_trainer.srs_items si
      JOIN cubing.solves s ON s.id = si.solve_id
      WHERE 1=1
    `;

    const params = [];

    if (active_only === 'true') {
      query += ` AND si.is_active = true`;
    }

    if (depth !== undefined) {
      params.push(parseInt(depth, 10));
      query += ` AND si.depth = $${params.length}`;
    }

    query += ` ORDER BY si.is_active DESC, si.next_review_at ASC`;
    params.push(parseInt(limit, 10));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset, 10));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM cross_trainer.srs_items WHERE 1=1`;
    const countParams = [];

    if (active_only === 'true') {
      countQuery += ` AND is_active = true`;
    }

    if (depth !== undefined) {
      countParams.push(parseInt(depth, 10));
      countQuery += ` AND depth = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      items: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error fetching SRS items:', err);
    res.status(500).json({ error: { message: 'Failed to fetch SRS items', code: 'INTERNAL_ERROR' } });
  }
});

// PATCH /api/srs/item/:id - Update SRS item (toggle active status)
router.patch('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ error: { message: 'is_active is required', code: 'VALIDATION_ERROR' } });
    }

    const result = await pool.query(
      `UPDATE cross_trainer.srs_items
       SET is_active = $1
       WHERE id = $2
       RETURNING id, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'SRS item not found', code: 'NOT_FOUND' } });
    }

    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Error updating SRS item:', err);
    res.status(500).json({ error: { message: 'Failed to update SRS item', code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
