const API_BASE = '/api';

export async function getScramble(moves, count = 1) {
  const res = await fetch(`${API_BASE}/scrambles/random?moves=${moves}&count=${count}`);
  if (!res.ok) throw new Error('Failed to fetch scramble');
  return res.json();
}

export async function createSession() {
  const res = await fetch(`${API_BASE}/sessions`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function endSession(sessionId, notes) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ended_at: new Date().toISOString(), notes }),
  });
  if (!res.ok) throw new Error('Failed to end session');
  return res.json();
}

export async function recordAttempt(attempt) {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attempt),
  });
  if (!res.ok) throw new Error('Failed to record attempt');
  return res.json();
}

export async function getSessionAttempts(sessionId) {
  const res = await fetch(`${API_BASE}/attempts?session_id=${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch attempts');
  return res.json();
}

export async function getStats(dateFrom, dateTo) {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE}/stats/summary${query}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getDailyStats(days = 30) {
  const res = await fetch(`${API_BASE}/stats/daily?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch daily stats');
  return res.json();
}

export async function getTimeByDifficulty(dateFrom) {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE}/stats/time-by-difficulty${query}`);
  if (!res.ok) throw new Error('Failed to fetch time by difficulty');
  return res.json();
}

export async function getRecentNotes(limit = 20) {
  const res = await fetch(`${API_BASE}/stats/recent-notes?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent notes');
  return res.json();
}

export async function getSessions(limit = 10, offset = 0) {
  const res = await fetch(`${API_BASE}/sessions?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

// SRS Endpoints

export async function getSRSDue(depth, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (depth !== undefined && depth !== null) params.append('depth', String(depth));
  const res = await fetch(`${API_BASE}/srs/due?${params}`);
  if (!res.ok) throw new Error('Failed to fetch due items');
  return res.json();
}

export async function recordSRSReview(srsItemId, quality, responseTimeMs, notes, userSolution) {
  const res = await fetch(`${API_BASE}/srs/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      srs_item_id: srsItemId,
      quality,
      response_time_ms: responseTimeMs,
      notes,
      user_solution: userSolution,
    }),
  });
  if (!res.ok) throw new Error('Failed to record review');
  return res.json();
}

export async function getSRSSolution(srsItemId, depth) {
  const res = await fetch(`${API_BASE}/srs/item/${srsItemId}/solution?depth=${depth}`);
  if (!res.ok) throw new Error('Failed to fetch solution');
  return res.json();
}

export async function addToSRS(solveId, depth, notes) {
  const res = await fetch(`${API_BASE}/srs/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solve_id: solveId, depth, notes }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to add to SRS');
  }
  return res.json();
}

export async function removeFromSRS(srsItemId) {
  const res = await fetch(`${API_BASE}/srs/item/${srsItemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove from SRS');
  return res.json();
}

export async function removeFromSRSByDepth(solveId, depth) {
  const res = await fetch(`${API_BASE}/srs/solve/${solveId}/depth/${depth}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove from SRS');
  return res.json();
}

export async function getSRSItems(filters = {}) {
  const params = new URLSearchParams();
  if (filters.activeOnly) params.append('active_only', 'true');
  if (filters.depth !== undefined && filters.depth !== null) params.append('depth', String(filters.depth));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE}/srs/items${query}`);
  if (!res.ok) throw new Error('Failed to fetch SRS items');
  return res.json();
}

export async function toggleSRSItemActive(srsItemId, isActive) {
  const res = await fetch(`${API_BASE}/srs/item/${srsItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error('Failed to update SRS item');
  return res.json();
}

export async function getSRSStats() {
  const res = await fetch(`${API_BASE}/srs/stats`);
  if (!res.ok) throw new Error('Failed to fetch SRS stats');
  return res.json();
}

export async function getAttemptsScatter(dateFrom, limit = 500) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (dateFrom) params.append('date_from', dateFrom);
  const res = await fetch(`${API_BASE}/stats/attempts-scatter?${params}`);
  if (!res.ok) throw new Error('Failed to fetch attempts scatter data');
  return res.json();
}

// Solves Browser Endpoints

export async function getSolves(filters = {}) {
  const params = new URLSearchParams();

  // Text filters
  if (filters.solver) params.append('solver', filters.solver);

  // Result time filters
  if (filters.minResult) params.append('min_result', String(filters.minResult));
  if (filters.maxResult) params.append('max_result', String(filters.maxResult));

  // Move count filters
  if (filters.minCross !== undefined && filters.minCross !== null) {
    params.append('min_cross', String(filters.minCross));
  }
  if (filters.maxCross !== undefined && filters.maxCross !== null) {
    params.append('max_cross', String(filters.maxCross));
  }
  if (filters.minPair1 !== undefined && filters.minPair1 !== null) {
    params.append('min_pair1', String(filters.minPair1));
  }
  if (filters.maxPair1 !== undefined && filters.maxPair1 !== null) {
    params.append('max_pair1', String(filters.maxPair1));
  }
  if (filters.minPair2 !== undefined && filters.minPair2 !== null) {
    params.append('min_pair2', String(filters.minPair2));
  }
  if (filters.maxPair2 !== undefined && filters.maxPair2 !== null) {
    params.append('max_pair2', String(filters.maxPair2));
  }
  if (filters.minPair3 !== undefined && filters.minPair3 !== null) {
    params.append('min_pair3', String(filters.minPair3));
  }
  if (filters.maxPair3 !== undefined && filters.maxPair3 !== null) {
    params.append('max_pair3', String(filters.maxPair3));
  }
  if (filters.minF2l !== undefined && filters.minF2l !== null) {
    params.append('min_f2l', String(filters.minF2l));
  }
  if (filters.maxF2l !== undefined && filters.maxF2l !== null) {
    params.append('max_f2l', String(filters.maxF2l));
  }
  if (filters.minTotal !== undefined && filters.minTotal !== null) {
    params.append('min_total', String(filters.minTotal));
  }
  if (filters.maxTotal !== undefined && filters.maxTotal !== null) {
    params.append('max_total', String(filters.maxTotal));
  }

  // Cross type filter
  if (filters.crossType) params.append('cross_type', filters.crossType);

  // Sorting
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.sortOrder) params.append('sort_order', filters.sortOrder);

  // Pagination
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE}/solves${query}`);
  if (!res.ok) throw new Error('Failed to fetch solves');
  return res.json();
}

export async function getSolve(id) {
  const res = await fetch(`${API_BASE}/solves/${id}`);
  if (!res.ok) throw new Error('Failed to fetch solve');
  return res.json();
}
