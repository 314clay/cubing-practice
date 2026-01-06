import { useState, useEffect, useCallback } from 'react';
import { getSolves, addToSRS, removeFromSRSByDepth } from '../../api/client';
import { SolveDetailModal } from './SolveDetailModal';

const DEPTH_LABELS = ['Cross', '+1 pair', '+2 pairs', '+3 pairs'];

const SORT_OPTIONS = [
  { value: 'result', label: 'Time' },
  { value: 'cross', label: 'Cross Moves' },
  { value: 'pair1', label: '1st Pair Moves' },
  { value: 'pair2', label: '2nd Pair Moves' },
  { value: 'pair3', label: '3rd Pair Moves' },
  { value: 'f2l', label: 'F2L Moves' },
  { value: 'total', label: 'Total Moves' },
];

// Dual-handle range slider component
function RangeFilter({ label, min, max, value, onChange }) {
  const [minVal, maxVal] = value;

  // Calculate percentages for the filled track
  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-xs text-gray-500">
          {minVal === min && maxVal === max ? 'Any' : `${minVal} - ${maxVal}`}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-2 bg-gray-700 rounded-full" />
        {/* Filled track between handles */}
        <div
          className="absolute h-2 bg-blue-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
        {/* Min slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={(e) => {
            const newMin = Math.min(parseInt(e.target.value), maxVal - 1);
            onChange([newMin, maxVal]);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500"
          style={{ zIndex: minVal > max - 10 ? 5 : 3 }}
        />
        {/* Max slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={(e) => {
            const newMax = Math.max(parseInt(e.target.value), minVal + 1);
            onChange([minVal, newMax]);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500"
          style={{ zIndex: 4 }}
        />
        {/* Min/Max labels at ends */}
        <div className="absolute -bottom-4 left-0 text-[10px] text-gray-600">{min}</div>
        <div className="absolute -bottom-4 right-0 text-[10px] text-gray-600">{max}</div>
      </div>
    </div>
  );
}

// Default filter ranges
const DEFAULT_CROSS = [0, 20];
const DEFAULT_PAIR = [0, 25];

export function SRSBrowser({ onAdd }) {
  const [solves, setSolves] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    solver: '',
    maxResult: '',
    // Move count filters [min, max]
    crossMoves: DEFAULT_CROSS,
    pair1Moves: DEFAULT_PAIR,
    pair2Moves: DEFAULT_PAIR,
    pair3Moves: DEFAULT_PAIR,
    // Sorting
    sortBy: 'result',
    sortOrder: 'asc',
    // Pagination
    limit: 20,
    offset: 0,
  });
  const [addingState, setAddingState] = useState({});
  const [selectedSolveId, setSelectedSolveId] = useState(null);

  // Check if any filter is active (not at default)
  const hasActiveFilters =
    filters.crossMoves[0] !== DEFAULT_CROSS[0] || filters.crossMoves[1] !== DEFAULT_CROSS[1] ||
    filters.pair1Moves[0] !== DEFAULT_PAIR[0] || filters.pair1Moves[1] !== DEFAULT_PAIR[1] ||
    filters.pair2Moves[0] !== DEFAULT_PAIR[0] || filters.pair2Moves[1] !== DEFAULT_PAIR[1] ||
    filters.pair3Moves[0] !== DEFAULT_PAIR[0] || filters.pair3Moves[1] !== DEFAULT_PAIR[1];

  const fetchSolves = useCallback(async () => {
    setLoading(true);
    try {
      const apiFilters = {
        solver: filters.solver || undefined,
        maxResult: filters.maxResult || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: filters.limit,
        offset: filters.offset,
        // Always send move filters
        minCross: filters.crossMoves[0],
        maxCross: filters.crossMoves[1],
        minPair1: filters.pair1Moves[0],
        maxPair1: filters.pair1Moves[1],
        minPair2: filters.pair2Moves[0],
        maxPair2: filters.pair2Moves[1],
        minPair3: filters.pair3Moves[0],
        maxPair3: filters.pair3Moves[1],
      };

      const data = await getSolves(apiFilters);
      setSolves(data.solves);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch solves:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSolves();
  }, [fetchSolves]);

  const handleToggleSRS = async (solveId, depth, isCurrentlyInSRS) => {
    const key = `${solveId}-${depth}`;
    setAddingState(prev => ({ ...prev, [key]: 'loading' }));

    try {
      if (isCurrentlyInSRS) {
        await removeFromSRSByDepth(solveId, depth);
        setSolves(prev => prev.map(solve => {
          if (solve.id === solveId) {
            return {
              ...solve,
              in_srs: (solve.in_srs || []).filter(d => d !== depth),
            };
          }
          return solve;
        }));
      } else {
        await addToSRS(solveId, depth);
        setSolves(prev => prev.map(solve => {
          if (solve.id === solveId) {
            return {
              ...solve,
              in_srs: [...(solve.in_srs || []), depth],
            };
          }
          return solve;
        }));
      }
      setAddingState(prev => ({ ...prev, [key]: undefined }));
      onAdd?.();
    } catch (err) {
      console.error('Failed to toggle SRS:', err);
      setAddingState(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => {
        setAddingState(prev => ({ ...prev, [key]: undefined }));
      }, 2000);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (newOffset) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const resetFilters = () => {
    setFilters(prev => ({
      ...prev,
      crossMoves: DEFAULT_CROSS,
      pair1Moves: DEFAULT_PAIR,
      pair2Moves: DEFAULT_PAIR,
      pair3Moves: DEFAULT_PAIR,
      offset: 0,
    }));
  };

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  // Get cross type badge
  const getCrossTypeBadge = (solve) => {
    if (solve.cross_type === 'xxcross') {
      return <span className="text-xs bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded">XX</span>;
    }
    if (solve.cross_type === 'xcross') {
      return <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">X</span>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-gray-800 rounded-lg p-4 space-y-4">
        {/* Basic filters row */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Solver</label>
            <input
              type="text"
              value={filters.solver}
              onChange={(e) => setFilters(prev => ({ ...prev, solver: e.target.value }))}
              placeholder="Search by solver name..."
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm text-gray-400 mb-1">Max time</label>
            <input
              type="number"
              step="0.01"
              value={filters.maxResult}
              onChange={(e) => setFilters(prev => ({ ...prev, maxResult: e.target.value }))}
              placeholder="e.g. 5.0"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            Search
          </button>
        </div>

        {/* Sort controls */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-400">Sort:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value, offset: 0 }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFilters(prev => ({
                ...prev,
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
                offset: 0,
              }))}
              className="bg-gray-700 text-white rounded px-2 py-1.5 text-sm hover:bg-gray-600 transition-colors"
            >
              {filters.sortOrder === 'asc' ? '↑ Low to High' : '↓ High to Low'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`text-sm transition-colors ml-auto flex items-center gap-1 ${
              hasActiveFilters ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {showFilters ? '▲ Hide' : '▼ Move Filters'}
            {hasActiveFilters && <span className="bg-blue-500 text-white text-xs px-1.5 rounded-full">!</span>}
          </button>
        </div>

        {/* Move count filters */}
        {showFilters && (
          <div className="border-t border-gray-700 pt-4 space-y-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              <RangeFilter
                label="Cross"
                min={0}
                max={20}
                value={filters.crossMoves}
                onChange={(val) => setFilters(prev => ({ ...prev, crossMoves: val, offset: 0 }))}
              />
              <RangeFilter
                label="1st Pair (0 = x-cross)"
                min={0}
                max={25}
                value={filters.pair1Moves}
                onChange={(val) => setFilters(prev => ({ ...prev, pair1Moves: val, offset: 0 }))}
              />
              <RangeFilter
                label="2nd Pair (0 = xx-cross)"
                min={0}
                max={25}
                value={filters.pair2Moves}
                onChange={(val) => setFilters(prev => ({ ...prev, pair2Moves: val, offset: 0 }))}
              />
              <RangeFilter
                label="3rd Pair"
                min={0}
                max={25}
                value={filters.pair3Moves}
                onChange={(val) => setFilters(prev => ({ ...prev, pair3Moves: val, offset: 0 }))}
              />
            </div>

            {/* Quick filter buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, pair1Moves: [0, 0], offset: 0 }))}
                className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded hover:bg-blue-800 transition-colors"
              >
                X-Cross Only
              </button>
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, pair1Moves: [0, 0], pair2Moves: [0, 0], offset: 0 }))}
                className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded hover:bg-purple-800 transition-colors"
              >
                XX-Cross Only
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-400">
            Showing {solves.length} of {total} solves
          </div>

          <div className="space-y-4">
            {solves.map(solve => (
              <div
                key={solve.id}
                className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => setSelectedSolveId(solve.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {solve.solver} - {solve.result}s
                      {getCrossTypeBadge(solve)}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {solve.competition || 'Practice'} | {solve.solve_date ? new Date(solve.solve_date).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                  {/* Move counts */}
                  <div className="flex gap-2 flex-wrap justify-end">
                    {solve.stm_cross1 != null && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        C: {solve.stm_cross1}
                      </span>
                    )}
                    {solve.stm_pair1 != null && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        P1: {solve.stm_pair1}
                      </span>
                    )}
                    {solve.stm_pair2 != null && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        P2: {solve.stm_pair2}
                      </span>
                    )}
                    {solve.stm_pair3 != null && (
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        P3: {solve.stm_pair3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Scramble preview */}
                <div className="bg-gray-900 rounded p-2 mb-3 text-sm">
                  <code className="text-gray-300 font-mono line-clamp-1">
                    {solve.scramble}
                  </code>
                </div>

                {/* Add to SRS buttons */}
                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm text-gray-400">SRS:</span>
                  {[0, 1, 2, 3].map(depth => {
                    const key = `${solve.id}-${depth}`;
                    const isInSRS = solve.in_srs?.includes(depth);
                    const state = addingState[key];

                    return (
                      <button
                        key={depth}
                        onClick={() => handleToggleSRS(solve.id, depth, isInSRS)}
                        disabled={state === 'loading'}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${
                          state === 'loading'
                            ? 'bg-gray-600 text-gray-400 cursor-wait'
                            : state === 'error'
                            ? 'bg-red-900 text-red-300'
                            : isInSRS
                            ? 'bg-green-900 text-green-300 hover:bg-red-900 hover:text-red-300'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {state === 'loading' ? '...' : state === 'error' ? 'Error' : isInSRS ? `${DEPTH_LABELS[depth]} ✓` : `+${DEPTH_LABELS[depth]}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => handlePageChange(filters.offset - filters.limit)}
                disabled={filters.offset === 0}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(filters.offset + filters.limit)}
                disabled={filters.offset + filters.limit >= total}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Solve Detail Modal */}
      {selectedSolveId && (
        <SolveDetailModal
          solveId={selectedSolveId}
          onClose={() => setSelectedSolveId(null)}
        />
      )}
    </div>
  );
}
