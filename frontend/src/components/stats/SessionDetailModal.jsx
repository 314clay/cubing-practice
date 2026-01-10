import { useState, useEffect } from 'react';
import { getSessionAttempts } from '../../api/client';

export function SessionDetailModal({ session, onClose }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionAttempts(session.id);
        setAttempts(data.attempts || []);
      } catch (err) {
        console.error('Failed to fetch session attempts:', err);
        setError('Failed to load session attempts');
      } finally {
        setLoading(false);
      }
    };

    if (session?.id) {
      fetchAttempts();
    }
  }, [session?.id]);

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

  const start = new Date(session.started_at);
  const end = session.ended_at ? new Date(session.ended_at) : null;
  const duration = end ? Math.round((end - start) / 1000 / 60) : null;

  // Calculate stats from attempts
  const attemptsWithTime = attempts.filter(a => a.inspection_time_ms);
  const stats = attemptsWithTime.length > 0 ? {
    best: Math.min(...attemptsWithTime.map(a => a.inspection_time_ms)),
    worst: Math.max(...attemptsWithTime.map(a => a.inspection_time_ms)),
    average: attemptsWithTime.reduce((sum, a) => sum + a.inspection_time_ms, 0) / attemptsWithTime.length,
    successRate: (attempts.filter(a => a.cross_success).length / attempts.length * 100).toFixed(0),
  } : null;

  const formatTime = (ms) => {
    if (!ms) return '-';
    const seconds = ms / 1000;
    return seconds.toFixed(2) + 's';
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Session Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm text-gray-400">Date</label>
              <p className="text-lg font-medium">
                {start.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Time</label>
              <p className="text-lg font-medium">
                {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {end && (
                  <span> - {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Duration</label>
              <p className="text-lg font-medium">
                {duration ? `${duration} minutes` : 'In progress'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Attempts</label>
              <p className="text-lg font-medium">{session.attempt_count}</p>
            </div>
          </div>

          {/* Session Notes */}
          {session.notes && (
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">Notes</label>
              <div className="bg-gray-900 rounded p-3 text-gray-300 italic">
                {session.notes}
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">Inspection Time Stats</label>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-xs text-gray-400">Best</div>
                  <div className="text-lg font-mono text-green-400">{formatTime(stats.best)}</div>
                </div>
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-xs text-gray-400">Average</div>
                  <div className="text-lg font-mono text-blue-400">{formatTime(stats.average)}</div>
                </div>
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-xs text-gray-400">Worst</div>
                  <div className="text-lg font-mono text-red-400">{formatTime(stats.worst)}</div>
                </div>
                <div className="bg-gray-900 rounded p-3 text-center">
                  <div className="text-xs text-gray-400">Success</div>
                  <div className="text-lg font-mono text-purple-400">{stats.successRate}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Attempts List */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Attempts</label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-400 animate-pulse">Loading attempts...</div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center py-8">{error}</div>
            ) : attempts.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No attempts recorded</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attempts.map((attempt, idx) => (
                  <div
                    key={attempt.id}
                    className="bg-gray-900 rounded p-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 w-8">#{idx + 1}</span>
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-sm">
                          {attempt.cross_moves}-move
                        </span>
                        {attempt.inspection_time_ms && (
                          <span className="font-mono">{formatTime(attempt.inspection_time_ms)}</span>
                        )}
                        {attempt.cross_success ? (
                          <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded text-xs">✓</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs">✗</span>
                        )}
                        {attempt.used_unlimited_time && (
                          <span className="px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded text-xs">∞</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {attempt.pairs_planned > 0 && `+${attempt.pairs_planned} pairs`}
                      </div>
                    </div>
                    {attempt.scramble && (
                      <div className="mt-2 font-mono text-xs text-gray-400 bg-gray-800 rounded px-2 py-1 flex items-center justify-between gap-2">
                        <span className="break-all">{attempt.scramble}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(attempt.scramble)}
                          className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-1"
                          title="Copy scramble"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
