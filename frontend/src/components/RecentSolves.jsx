import { useState } from 'react';

function formatTime(ms) {
  if (ms === null || ms === undefined) return '-';
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

export function RecentSolves({ attempts, onDelete }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Show most recent first, limit to last 10
  const recentAttempts = [...attempts].reverse().slice(0, 10);

  const handleDeleteClick = (id) => {
    setConfirmingId(id);
  };

  const handleConfirmDelete = async (id) => {
    setDeleting(true);
    try {
      await onDelete(id);
    } catch (err) {
      console.error('Failed to delete attempt:', err);
    } finally {
      setDeleting(false);
      setConfirmingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmingId(null);
  };

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (attempts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Solves</h3>
        <p className="text-xs text-gray-500">No solves yet this session</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Solves</h3>
      <div className="space-y-2">
        {recentAttempts.map((attempt, index) => (
          <div key={attempt.id} className="bg-gray-700/50 rounded overflow-hidden">
            <div className="flex items-center justify-between text-sm px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-500 text-xs w-4">#{attempts.length - index}</span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    attempt.cross_success ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-300 truncate">
                  {formatTime(attempt.inspection_time_ms)}
                  {attempt.execution_time_ms && (
                    <span className="text-gray-500 ml-1">
                      + {formatTime(attempt.execution_time_ms)}
                    </span>
                  )}
                </span>
                {attempt.blindfolded && (
                  <span className="text-yellow-500 text-xs">BLD</span>
                )}
                {attempt.pairs_planned > 0 && (
                  <span className="text-blue-400 text-xs">+{attempt.pairs_planned}p</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Scramble toggle button */}
                <button
                  onClick={() => toggleExpanded(attempt.id)}
                  className={`text-gray-500 hover:text-gray-300 transition-colors p-1 ${
                    expandedId === attempt.id ? 'text-blue-400' : ''
                  }`}
                  title="Show scramble"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {confirmingId === attempt.id ? (
                  <>
                    <button
                      onClick={() => handleConfirmDelete(attempt.id)}
                      disabled={deleting}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      disabled={deleting}
                      className="text-xs px-2 py-1 bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDeleteClick(attempt.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Delete solve"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded scramble view */}
            {expandedId === attempt.id && (
              <div className="px-3 pb-2 pt-1 border-t border-gray-600/50">
                <code className="text-xs text-gray-400 font-mono break-all">
                  {attempt.scramble}
                </code>
              </div>
            )}
          </div>
        ))}
      </div>
      {attempts.length > 10 && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Showing last 10 of {attempts.length} solves
        </p>
      )}
    </div>
  );
}
