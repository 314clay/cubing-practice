export function DifficultyBreakdown({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">By Difficulty</h2>
        <div className="text-gray-500 text-center py-4">No data yet</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">By Difficulty</h2>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((level) => {
          const item = data[level];
          if (!item) return null;

          const rate = item.success_rate;
          const color = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500';

          const avgTime = item.avg_inspection_time_ms
            ? (item.avg_inspection_time_ms / 1000).toFixed(1)
            : null;

          return (
            <div key={level} className="flex items-center gap-3">
              <span className="w-16 text-gray-400 text-sm">{level} move{level > 1 ? 's' : ''}</span>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-20 text-right text-sm">
                <span className={rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {rate}%
                </span>
                <span className="text-gray-500 ml-1">({item.attempts})</span>
              </span>
              {avgTime && (
                <span className="w-12 text-right text-xs text-blue-400 font-mono">
                  {avgTime}s
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
