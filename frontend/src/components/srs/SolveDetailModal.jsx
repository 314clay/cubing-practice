import { useState, useEffect } from 'react';
import { getSolve } from '../../api/client';

const DEPTH_LABELS = ['Cross', '+1 pair', '+2 pairs', '+3 pairs'];

export function SolveDetailModal({ solveId, onClose }) {
  const [solve, setSolve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSolve = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSolve(solveId);
        setSolve(data);
      } catch (err) {
        console.error('Failed to fetch solve:', err);
        setError('Failed to load solve details');
      } finally {
        setLoading(false);
      }
    };

    if (solveId) {
      fetchSolve();
    }
  }, [solveId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Solve Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 animate-pulse">Loading...</div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-12">{error}</div>
          ) : solve ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Solver</label>
                  <p className="text-lg font-medium">{solve.solver}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Time</label>
                  <p className="text-lg font-medium">{solve.result}s</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Competition</label>
                  <p>{solve.competition || 'Practice'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Date</label>
                  <p>
                    {solve.solve_date
                      ? new Date(solve.solve_date).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                </div>
                {solve.method && (
                  <div>
                    <label className="text-sm text-gray-400">Method</label>
                    <p>{solve.method}</p>
                  </div>
                )}
                {solve.stm_cross1 && (
                  <div>
                    <label className="text-sm text-gray-400">Cross STM</label>
                    <p>{solve.stm_cross1} moves</p>
                  </div>
                )}
                {solve.time_cross1 && (
                  <div>
                    <label className="text-sm text-gray-400">Cross Time</label>
                    <p>{solve.time_cross1}s</p>
                  </div>
                )}
              </div>

              {/* Scramble */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Scramble</label>
                <div className="bg-gray-900 rounded p-3">
                  <code className="text-gray-300 font-mono text-sm break-all">
                    {solve.scramble}
                  </code>
                </div>
              </div>

              {/* Reconstruction */}
              {solve.reconstruction && (
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Reconstruction
                  </label>
                  <div className="bg-gray-900 rounded p-3">
                    <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-all">
                      {solve.reconstruction}
                    </pre>
                  </div>
                </div>
              )}

              {/* Parsed Segments */}
              {solve.parsed_segments && solve.parsed_segments.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Parsed Steps
                  </label>
                  <div className="space-y-2">
                    {solve.parsed_segments.map((segment, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900 rounded p-3 flex justify-between items-start"
                      >
                        <div>
                          <span className="text-blue-400 font-medium">
                            {segment.label || `Step ${idx + 1}`}
                          </span>
                          <code className="text-gray-300 font-mono text-sm ml-3">
                            {segment.moves}
                          </code>
                        </div>
                        {segment.moveCount !== undefined && (
                          <span className="text-xs text-gray-500">
                            {segment.moveCount} moves
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SRS Status */}
              {solve.in_srs && solve.in_srs.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    In SRS
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {solve.in_srs.map((depth) => (
                      <span
                        key={depth}
                        className="px-3 py-1 bg-green-900 text-green-300 rounded text-sm"
                      >
                        {DEPTH_LABELS[depth]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Link */}
              {solve.alg_cubing_url && (
                <div>
                  <a
                    href={solve.alg_cubing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View on alg.cubing.net
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
