export function SessionBar({ session, stats, onEndSession, onStartSession }) {
  if (!session) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
        <span className="text-gray-400">No active session</span>
        <button
          onClick={onStartSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Session
        </button>
      </div>
    );
  }

  const startTime = new Date(session.started_at);
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap gap-4 justify-between items-center">
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-400">Started:</span>{' '}
          <span className="text-white">{startTime.toLocaleTimeString()}</span>
        </div>
        <div>
          <span className="text-gray-400">Duration:</span>{' '}
          <span className="text-white">{elapsed} min</span>
        </div>
        <div>
          <span className="text-gray-400">Attempts:</span>{' '}
          <span className="text-white">{stats.total}</span>
        </div>
        <div>
          <span className="text-gray-400">Success Rate:</span>{' '}
          <span className={stats.successRate >= 70 ? 'text-green-400' : stats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
            {stats.successRate}%
          </span>
        </div>
        {stats.avgInspectionTimeSuccessful != null && (
          <div>
            <span className="text-gray-400">Avg Insp:</span>{' '}
            <span className="text-white">{(stats.avgInspectionTimeSuccessful / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>
      <button
        onClick={onEndSession}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
      >
        End Session
      </button>
    </div>
  );
}
