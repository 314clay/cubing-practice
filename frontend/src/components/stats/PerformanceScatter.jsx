import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from 'recharts';

export function PerformanceScatter({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Time vs Success by Difficulty</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No timing data available yet
        </div>
      </div>
    );
  }

  // Transform data for scatter plot
  // Each point represents a difficulty level with its avg time and success rate
  const scatterData = data
    .filter(d => d.success_avg_ms || d.fail_avg_ms)
    .map(d => {
      const totalCount = (d.success_count || 0) + (d.fail_count || 0);
      const successCount = d.success_count || 0;
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

      // Use weighted average of success and fail times
      const avgTimeMs = totalCount > 0
        ? ((d.success_avg_ms || 0) * successCount + (d.fail_avg_ms || 0) * (totalCount - successCount)) / totalCount
        : 0;

      return {
        difficulty: d.cross_moves,
        label: `${d.cross_moves}m`,
        avgTime: avgTimeMs / 1000,
        successRate: Math.round(successRate * 10) / 10,
        totalAttempts: totalCount,
        successCount,
        failCount: totalCount - successCount,
        successAvgTime: d.success_avg_ms ? (d.success_avg_ms / 1000).toFixed(1) : null,
        failAvgTime: d.fail_avg_ms ? (d.fail_avg_ms / 1000).toFixed(1) : null,
        successMedianTime: d.success_median_ms ? (d.success_median_ms / 1000).toFixed(1) : null,
        failMedianTime: d.fail_median_ms ? (d.fail_median_ms / 1000).toFixed(1) : null,
      };
    });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-xs">
        <p className="text-white font-medium mb-2">{d.difficulty} move cross</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-400">Avg Time: {d.avgTime.toFixed(1)}s</p>
          <p className={d.successRate >= 80 ? 'text-green-400' : d.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
            Success Rate: {d.successRate}%
          </p>
          <p className="text-gray-400">Total Attempts: {d.totalAttempts}</p>
          <div className="border-t border-gray-700 mt-2 pt-2">
            <p className="text-green-400 text-xs">
              Success: {d.successCount} ({d.successAvgTime}s avg, {d.successMedianTime}s median)
            </p>
            <p className="text-red-400 text-xs">
              Fail: {d.failCount} ({d.failAvgTime}s avg, {d.failMedianTime}s median)
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Calculate domain with padding
  const maxTime = Math.max(...scatterData.map(d => d.avgTime));
  const minTime = Math.min(...scatterData.map(d => d.avgTime));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Time vs Success by Difficulty</h2>
      <p className="text-sm text-gray-400 mb-4">
        Each point shows avg inspection time vs success rate for a difficulty level
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="avgTime"
              name="Avg Time"
              unit="s"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[Math.max(0, minTime - 1), maxTime + 1]}
              tickFormatter={(v) => `${v.toFixed(0)}s`}
              label={{ value: 'Avg Inspection Time (s)', position: 'bottom', fill: '#9CA3AF', fontSize: 12, offset: 0 }}
            />
            <YAxis
              type="number"
              dataKey="successRate"
              name="Success Rate"
              unit="%"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              label={{ value: 'Success Rate', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
            />
            <ReferenceLine y={80} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.5} />
            <ReferenceLine y={50} stroke="#EAB308" strokeDasharray="5 5" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name="Difficulty"
              data={scatterData}
              fill="#3B82F6"
              shape={(props) => {
                const { cx, cy, payload } = props;
                const size = Math.min(40, Math.max(20, payload.totalAttempts / 5));
                const successRate = payload.successRate;
                const color = successRate >= 80 ? '#10B981' : successRate >= 50 ? '#EAB308' : '#EF4444';
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={size / 2} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10} fontWeight="bold">
                      {payload.label}
                    </text>
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span> 80%+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span> 50-79%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span> &lt;50%
        </span>
        <span className="text-gray-500">| Circle size = attempt count</span>
      </div>
    </div>
  );
}
