import { useState, useEffect, useCallback } from 'react';
import { getSRSItems, toggleSRSItemActive } from '../../api/client';
import { SolveDetailModal } from './SolveDetailModal';

const DEPTH_LABELS = ['Cross', '+1 pair', '+2 pairs', '+3 pairs'];

export function SRSManager({ onUpdate }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    showInactive: true,
    depth: null,
    limit: 20,
    offset: 0,
  });
  const [togglingState, setTogglingState] = useState({});
  const [selectedSolveId, setSelectedSolveId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSRSItems({
        activeOnly: !filters.showInactive,
        depth: filters.depth,
        limit: filters.limit,
        offset: filters.offset,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch SRS items:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggleActive = async (itemId, currentlyActive) => {
    setTogglingState(prev => ({ ...prev, [itemId]: true }));
    try {
      await toggleSRSItemActive(itemId, !currentlyActive);
      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return { ...item, is_active: !currentlyActive };
        }
        return item;
      }));
      onUpdate?.();
    } catch (err) {
      console.error('Failed to toggle SRS item:', err);
    } finally {
      setTogglingState(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handlePageChange = (newOffset) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  const formatNextReview = (date) => {
    if (!date) return 'Never reviewed';
    const d = new Date(date);
    const now = new Date();
    const diffMs = d - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Due now';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => setFilters(prev => ({ ...prev, showInactive: e.target.checked, offset: 0 }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            Show inactive items
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Depth:</span>
            <select
              value={filters.depth ?? ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                depth: e.target.value === '' ? null : parseInt(e.target.value, 10),
                offset: 0
              }))}
              className="bg-gray-700 text-white rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All depths</option>
              {DEPTH_LABELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-400">
            Showing {items.length} of {total} SRS items
          </div>

          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className={`rounded-lg p-4 cursor-pointer transition-colors ${
                  item.is_active ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800/70'
                }`}
                onClick={() => setSelectedSolveId(item.solve_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        {item.solver} - {item.result}s
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.is_active
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-300">
                        {DEPTH_LABELS[item.depth]}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 mb-2">
                      {item.competition || 'Practice'}
                    </p>

                    {/* Scramble preview */}
                    <div className="bg-gray-900 rounded p-2 mb-3 text-sm">
                      <code className="text-gray-300 font-mono line-clamp-1">
                        {item.scramble}
                      </code>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>
                        {formatNextReview(item.next_review_at)}
                      </span>
                      <span>
                        Interval: {item.interval_days} days
                      </span>
                      <span>
                        Ease: {parseFloat(item.ease_factor).toFixed(2)}
                      </span>
                      <span>
                        {item.times_correct}/{item.times_correct + item.times_incorrect} correct
                      </span>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(item.id, item.is_active);
                    }}
                    disabled={togglingState[item.id]}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      togglingState[item.id]
                        ? 'bg-gray-600 text-gray-400 cursor-wait'
                        : item.is_active
                        ? 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                        : 'bg-green-900 text-green-300 hover:bg-green-800'
                    }`}
                  >
                    {togglingState[item.id]
                      ? '...'
                      : item.is_active
                      ? 'Remove from training'
                      : 'Add to training'}
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No SRS items found. Add solves from the Browse tab.
              </div>
            )}
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
