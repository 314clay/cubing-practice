import { Link } from 'react-router-dom';

export function SRSStats({ stats }) {
  if (!stats) return null;

  const depthLabels = {
    0: 'Cross',
    1: 'Cross + 1',
    2: 'Cross + 2',
    3: 'Cross + 3',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">SRS Progress</h3>
        <Link to="/srs" className="text-sm text-blue-400 hover:text-blue-300">
          Go to SRS &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{stats.total_items}</div>
          <div className="text-sm text-gray-400">Total Cards</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.due_today > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {stats.due_today}
          </div>
          <div className="text-sm text-gray-400">Due Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{stats.reviews_last_7_days}</div>
          <div className="text-sm text-gray-400">Reviews (7d)</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getRetentionColor(stats.retention_rate)}`}>
            {stats.retention_rate !== null ? `${stats.retention_rate}%` : '-'}
          </div>
          <div className="text-sm text-gray-400">Retention (7d)</div>
        </div>
      </div>

      {Object.keys(stats.by_depth || {}).length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <div className="text-sm text-gray-400 mb-2">Cards by Depth</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((depth) => {
              const depthStats = stats.by_depth[depth];
              if (!depthStats) return null;
              return (
                <div key={depth} className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-lg font-semibold text-white">{depthStats.items}</div>
                  <div className="text-xs text-gray-400">{depthLabels[depth]}</div>
                  <div className="text-xs text-gray-500">
                    EF: {depthStats.avg_ease.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getRetentionColor(rate) {
  if (rate === null) return 'text-gray-400';
  if (rate >= 90) return 'text-green-400';
  if (rate >= 70) return 'text-yellow-400';
  return 'text-red-400';
}
