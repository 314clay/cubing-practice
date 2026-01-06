const express = require('express');
const router = express.Router();
const pool = require('../db');
const { parseReconstruction, generateAlgCubingUrl } = require('../services/reconstruction');

// Valid sort fields mapping
const SORT_FIELDS = {
  result: 's.result',
  cross: 's.stm_cross1',
  pair1: 's.stm_pair1',
  pair2: 's.stm_pair2',
  pair3: 's.stm_pair3',
  f2l: 's.stm_f2l',
  total: 's.stm_total',
  date: 's.solve_date',
};

// GET /api/solves - Browse available solves
router.get('/', async (req, res) => {
  try {
    const {
      solver,
      min_result, max_result,
      min_cross, max_cross,
      min_pair1, max_pair1,
      min_pair2, max_pair2,
      min_pair3, max_pair3,
      min_f2l, max_f2l,
      min_total, max_total,
      cross_type,
      sort_by = 'result',
      sort_order = 'asc',
      limit = 20,
      offset = 0,
    } = req.query;

    let query = `
      SELECT
        s.id,
        s.solver,
        s.result,
        s.competition,
        s.solve_date,
        s.scramble,
        s.reconstruction IS NOT NULL as has_reconstruction,
        s.stm_cross1,
        s.stm_pair1,
        s.stm_pair2,
        s.stm_pair3,
        s.stm_pair4,
        s.stm_f2l,
        s.stm_total,
        s.cross_type,
        s.method,
        (
          SELECT ARRAY_AGG(depth)
          FROM cross_trainer.srs_items
          WHERE solve_id = s.id
        ) as in_srs
      FROM cubing.solves s
      WHERE s.puzzle = '3x3'
        AND s.reconstruction IS NOT NULL
        AND s.scramble IS NOT NULL
    `;

    const params = [];

    // Text search filters
    if (solver) {
      params.push(`%${solver}%`);
      query += ` AND s.solver ILIKE $${params.length}`;
    }

    // Result time filters
    if (min_result) {
      params.push(parseFloat(min_result));
      query += ` AND s.result >= $${params.length}`;
    }
    if (max_result) {
      params.push(parseFloat(max_result));
      query += ` AND s.result <= $${params.length}`;
    }

    // Cross move filters
    if (min_cross) {
      params.push(parseInt(min_cross, 10));
      query += ` AND s.stm_cross1 >= $${params.length}`;
    }
    if (max_cross) {
      params.push(parseInt(max_cross, 10));
      query += ` AND s.stm_cross1 <= $${params.length}`;
    }

    // Pair 1 move filters
    if (min_pair1 !== undefined && min_pair1 !== '') {
      params.push(parseInt(min_pair1, 10));
      query += ` AND s.stm_pair1 >= $${params.length}`;
    }
    if (max_pair1 !== undefined && max_pair1 !== '') {
      params.push(parseInt(max_pair1, 10));
      query += ` AND s.stm_pair1 <= $${params.length}`;
    }

    // Pair 2 move filters
    if (min_pair2 !== undefined && min_pair2 !== '') {
      params.push(parseInt(min_pair2, 10));
      query += ` AND s.stm_pair2 >= $${params.length}`;
    }
    if (max_pair2 !== undefined && max_pair2 !== '') {
      params.push(parseInt(max_pair2, 10));
      query += ` AND s.stm_pair2 <= $${params.length}`;
    }

    // Pair 3 move filters
    if (min_pair3 !== undefined && min_pair3 !== '') {
      params.push(parseInt(min_pair3, 10));
      query += ` AND s.stm_pair3 >= $${params.length}`;
    }
    if (max_pair3 !== undefined && max_pair3 !== '') {
      params.push(parseInt(max_pair3, 10));
      query += ` AND s.stm_pair3 <= $${params.length}`;
    }

    // F2L total move filters
    if (min_f2l) {
      params.push(parseInt(min_f2l, 10));
      query += ` AND s.stm_f2l >= $${params.length}`;
    }
    if (max_f2l) {
      params.push(parseInt(max_f2l, 10));
      query += ` AND s.stm_f2l <= $${params.length}`;
    }

    // Total move filters
    if (min_total) {
      params.push(parseInt(min_total, 10));
      query += ` AND s.stm_total >= $${params.length}`;
    }
    if (max_total) {
      params.push(parseInt(max_total, 10));
      query += ` AND s.stm_total <= $${params.length}`;
    }

    // Cross type filter
    if (cross_type) {
      params.push(cross_type);
      query += ` AND s.cross_type = $${params.length}`;
    }

    // Sorting - validate and apply
    const sortField = SORT_FIELDS[sort_by] || SORT_FIELDS.result;
    const sortDirection = sort_order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortField} ${sortDirection} NULLS LAST`;

    params.push(parseInt(limit, 10));
    query += ` LIMIT $${params.length}`;

    params.push(parseInt(offset, 10));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Get total count with same filters
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cubing.solves s
      WHERE s.puzzle = '3x3'
        AND s.reconstruction IS NOT NULL
        AND s.scramble IS NOT NULL
    `;
    const countParams = [];

    if (solver) {
      countParams.push(`%${solver}%`);
      countQuery += ` AND s.solver ILIKE $${countParams.length}`;
    }
    if (min_result) {
      countParams.push(parseFloat(min_result));
      countQuery += ` AND s.result >= $${countParams.length}`;
    }
    if (max_result) {
      countParams.push(parseFloat(max_result));
      countQuery += ` AND s.result <= $${countParams.length}`;
    }
    if (min_cross) {
      countParams.push(parseInt(min_cross, 10));
      countQuery += ` AND s.stm_cross1 >= $${countParams.length}`;
    }
    if (max_cross) {
      countParams.push(parseInt(max_cross, 10));
      countQuery += ` AND s.stm_cross1 <= $${countParams.length}`;
    }
    if (min_pair1 !== undefined && min_pair1 !== '') {
      countParams.push(parseInt(min_pair1, 10));
      countQuery += ` AND s.stm_pair1 >= $${countParams.length}`;
    }
    if (max_pair1 !== undefined && max_pair1 !== '') {
      countParams.push(parseInt(max_pair1, 10));
      countQuery += ` AND s.stm_pair1 <= $${countParams.length}`;
    }
    if (min_pair2 !== undefined && min_pair2 !== '') {
      countParams.push(parseInt(min_pair2, 10));
      countQuery += ` AND s.stm_pair2 >= $${countParams.length}`;
    }
    if (max_pair2 !== undefined && max_pair2 !== '') {
      countParams.push(parseInt(max_pair2, 10));
      countQuery += ` AND s.stm_pair2 <= $${countParams.length}`;
    }
    if (min_pair3 !== undefined && min_pair3 !== '') {
      countParams.push(parseInt(min_pair3, 10));
      countQuery += ` AND s.stm_pair3 >= $${countParams.length}`;
    }
    if (max_pair3 !== undefined && max_pair3 !== '') {
      countParams.push(parseInt(max_pair3, 10));
      countQuery += ` AND s.stm_pair3 <= $${countParams.length}`;
    }
    if (min_f2l) {
      countParams.push(parseInt(min_f2l, 10));
      countQuery += ` AND s.stm_f2l >= $${countParams.length}`;
    }
    if (max_f2l) {
      countParams.push(parseInt(max_f2l, 10));
      countQuery += ` AND s.stm_f2l <= $${countParams.length}`;
    }
    if (min_total) {
      countParams.push(parseInt(min_total, 10));
      countQuery += ` AND s.stm_total >= $${countParams.length}`;
    }
    if (max_total) {
      countParams.push(parseInt(max_total, 10));
      countQuery += ` AND s.stm_total <= $${countParams.length}`;
    }
    if (cross_type) {
      countParams.push(cross_type);
      countQuery += ` AND s.cross_type = $${countParams.length}`;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      solves: result.rows.map(row => ({
        ...row,
        in_srs: row.in_srs || [],
      })),
      total: parseInt(countResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error('Error fetching solves:', err);
    res.status(500).json({ error: { message: 'Failed to fetch solves', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/solves/:id - Get full solve details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        s.*,
        (
          SELECT ARRAY_AGG(depth)
          FROM cross_trainer.srs_items
          WHERE solve_id = s.id
        ) as in_srs
       FROM cubing.solves s
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Solve not found', code: 'NOT_FOUND' } });
    }

    const solve = result.rows[0];
    const parsedSegments = parseReconstruction(solve.reconstruction);

    res.json({
      id: solve.id,
      solver: solve.solver,
      result: solve.result,
      competition: solve.competition,
      solve_date: solve.solve_date,
      scramble: solve.scramble,
      reconstruction: solve.reconstruction,
      parsed_segments: parsedSegments,
      method: solve.method,
      stm_cross1: solve.stm_cross1,
      time_cross1: solve.time_cross1,
      in_srs: solve.in_srs || [],
      alg_cubing_url: solve.alg_cubing_url || generateAlgCubingUrl(solve.scramble, solve.reconstruction),
    });
  } catch (err) {
    console.error('Error fetching solve:', err);
    res.status(500).json({ error: { message: 'Failed to fetch solve', code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
