/**
 * Backfill script to populate stm_pair1-4 and cross_type columns
 * Run with: node server/scripts/backfill-move-counts.js
 */

const pool = require('../db');
const { parseReconstruction, extractMoves, countMoves } = require('../services/reconstruction');

async function backfill() {
  console.log('Starting backfill of move count columns...');

  // Get all solves with reconstructions
  const result = await pool.query(`
    SELECT id, reconstruction
    FROM cubing.solves
    WHERE reconstruction IS NOT NULL
  `);

  console.log(`Found ${result.rows.length} solves to process`);

  let updated = 0;
  let errors = 0;

  for (const solve of result.rows) {
    try {
      const segments = parseReconstruction(solve.reconstruction);

      if (!segments) {
        continue;
      }

      // Calculate move counts for each pair
      let pair1Moves = null;
      let pair2Moves = null;
      let pair3Moves = null;
      let pair4Moves = null;

      // Handle x-cross/xx-cross cases
      if (segments.crossType === 'xcross') {
        pair1Moves = 0; // Included in cross
        if (segments.pair2 && !segments.pair2.startsWith('(included')) {
          pair2Moves = countMoves(extractMoves(segments.pair2));
        }
      } else if (segments.crossType === 'xxcross') {
        pair1Moves = 0; // Included in cross
        pair2Moves = 0; // Included in cross
      } else {
        // Normal cross
        if (segments.pair1 && !segments.pair1.startsWith('(included')) {
          pair1Moves = countMoves(extractMoves(segments.pair1));
        }
        if (segments.pair2 && !segments.pair2.startsWith('(included')) {
          pair2Moves = countMoves(extractMoves(segments.pair2));
        }
      }

      if (segments.pair3 && !segments.pair3.startsWith('(included')) {
        pair3Moves = countMoves(extractMoves(segments.pair3));
      }
      if (segments.pair4 && !segments.pair4.startsWith('(included')) {
        pair4Moves = countMoves(extractMoves(segments.pair4));
      }

      // Update the row
      await pool.query(`
        UPDATE cubing.solves
        SET stm_pair1 = $1,
            stm_pair2 = $2,
            stm_pair3 = $3,
            stm_pair4 = $4,
            cross_type = $5
        WHERE id = $6
      `, [pair1Moves, pair2Moves, pair3Moves, pair4Moves, segments.crossType, solve.id]);

      updated++;

      if (updated % 50 === 0) {
        console.log(`Processed ${updated} solves...`);
      }
    } catch (err) {
      console.error(`Error processing solve ${solve.id}:`, err.message);
      errors++;
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);

  // Show some sample results
  const sample = await pool.query(`
    SELECT id, solver, cross_type, stm_cross1, stm_pair1, stm_pair2, stm_pair3, stm_pair4
    FROM cubing.solves
    WHERE stm_pair1 IS NOT NULL
    LIMIT 5
  `);

  console.log('\nSample results:');
  console.table(sample.rows);

  await pool.end();
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
