/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings:
 * 0 - Complete blackout, no recall
 * 1 - Wrong answer, but recognized solution when shown
 * 2 - Wrong answer, but solution seemed easy
 * 3 - Correct answer with serious difficulty
 * 4 - Correct answer with some hesitation
 * 5 - Perfect response, instant recall
 */

/**
 * Calculate new SRS state based on quality rating
 * @param {object} item - Current SRS item state
 * @param {number} quality - Quality rating 0-5
 * @returns {object} New SRS state with easeFactor, interval, repetitions, nextReviewAt
 */
function sm2(item, quality) {
  let easeFactor = parseFloat(item.ease_factor || item.easeFactor || 2.5);
  let interval = parseInt(item.interval_days || item.interval || 1, 10);
  let repetitions = parseInt(item.repetitions || 0, 10);

  if (quality < 3) {
    // Failed - reset to start, show again immediately
    repetitions = 0;
    interval = 0;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor using SM-2 formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Minimum ease factor of 1.3
  easeFactor = Math.max(1.3, easeFactor);

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
    interval,
    repetitions,
    nextReviewAt,
    passed: quality >= 3,
  };
}

/**
 * Get a human-readable description of the quality rating
 */
function getQualityLabel(quality) {
  const labels = {
    0: 'Complete blackout',
    1: 'Wrong, recognized after',
    2: 'Wrong, seemed easy',
    3: 'Correct with difficulty',
    4: 'Correct with hesitation',
    5: 'Perfect recall',
  };
  return labels[quality] || 'Unknown';
}

/**
 * Calculate retention rate from review history
 * @param {array} reviews - Array of reviews with quality ratings
 * @returns {number} Retention rate (0-1)
 */
function calculateRetentionRate(reviews) {
  if (!reviews || reviews.length === 0) return 0;

  const passed = reviews.filter(r => r.quality >= 3).length;
  return passed / reviews.length;
}

module.exports = {
  sm2,
  getQualityLabel,
  calculateRetentionRate,
};
