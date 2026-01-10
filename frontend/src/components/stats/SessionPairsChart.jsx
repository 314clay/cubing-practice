import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Interpolate color based on success rate: red (0%) -> yellow (50%) -> green (100%)
function getSuccessRateColor(successRate) {
  if (successRate <= 0.5) {
    // Red to Yellow: 0% -> 50%
    const t = successRate * 2; // 0 to 1
    const r = 239; // EF
    const g = Math.round(68 + (200 - 68) * t); // 44 -> C8
    const b = Math.round(68 * (1 - t)); // 44 -> 0
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Green: 50% -> 100%
    const t = (successRate - 0.5) * 2; // 0 to 1
    const r = Math.round(239 - (239 - 16) * t); // EF -> 10
    const g = Math.round(200 + (185 - 200) * t); // C8 -> B9
    const b = Math.round(0 + 129 * t); // 0 -> 81
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function SessionPairsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Pairs Planned by Session</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No session data available yet
        </div>
      </div>
    );
  }

  // Sort data chronologically and add index for even spacing
  const sortedData = [...data].sort(
    (a, b) => new Date(a.started_at) - new Date(b.started_at)
  );

  const sessionNumToDate = {};
  const chartData = sortedData.map((session, index) => {
    const sessionNum = index + 1;
    const dateStr = new Date(session.started_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    sessionNumToDate[sessionNum] = dateStr;

    const successRate = session.attempt_count > 0
      ? session.successful_attempts / session.attempt_count
      : 0;

    return {
      sessionNum,
      avgPairs: session.avg_pairs_planned,
      attemptCount: session.attempt_count,
      successfulAttempts: session.successful_attempts,
      successRate,
      avgDifficulty: session.avg_difficulty,
      dateStr: new Date(session.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  });

  const totalSessions = sortedData.length;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const successPercent = (d.successRate * 100).toFixed(0);

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-xs">
        <p className="text-white font-medium mb-2">{d.dateStr}</p>
        <div className="space-y-1 text-sm">
          <p className="text-purple-400">Avg Pairs Planned: {d.avgPairs.toFixed(2)}</p>
          <p style={{ color: getSuccessRateColor(d.successRate) }}>
            Success Rate: {successPercent}% ({d.successfulAttempts}/{d.attemptCount})
          </p>
          {d.avgDifficulty && (
            <p className="text-gray-300">Avg Difficulty: {d.avgDifficulty.toFixed(1)} moves</p>
          )}
        </div>
      </div>
    );
  };

  const maxPairs = Math.max(...chartData.map(d => d.avgPairs));

  const formatSessionDate = (sessionNum) => {
    return sessionNumToDate[sessionNum] || '';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Pairs Planned by Session</h2>
      <p className="text-sm text-gray-400 mb-4">
        Average pairs planned per session (excludes untracked attempts)
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="sessionNum"
              name="Session"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[1, totalSessions]}
              tickFormatter={formatSessionDate}
              label={{ value: 'Session Date', position: 'bottom', fill: '#9CA3AF', fontSize: 12, offset: 0 }}
            />
            <YAxis
              type="number"
              dataKey="avgPairs"
              name="Avg Pairs Planned"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[0, Math.ceil(maxPairs) + 0.5]}
              label={{ value: 'Avg Pairs Planned', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name="Sessions"
              data={chartData}
              shape={(props) => {
                const { cx, cy, payload } = props;
                // Size based on number of successful attempts
                const radius = Math.min(4 + payload.successfulAttempts * 0.5, 12);
                const color = getSuccessRateColor(payload.successRate);
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={color}
                    fillOpacity={0.8}
                    stroke={color}
                    strokeWidth={1}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center items-center gap-4 mt-2 text-xs text-gray-400">
        <span>Size = # of successful attempts</span>
        <span className="flex items-center gap-1">
          Color:
          <span className="text-red-500">0%</span>
          <span className="text-yellow-400">50%</span>
          <span className="text-green-500">100%</span>
          success
        </span>
      </div>
    </div>
  );
}
