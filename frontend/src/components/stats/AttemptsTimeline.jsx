import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function AttemptsTimeline({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Attempts Timeline</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No attempt data available yet
        </div>
      </div>
    );
  }

  // Sort data chronologically and add index for even spacing
  const sortedData = [...data].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  // Transform data - separate success and fail for different colors
  const successData = [];
  const failData = [];
  const attemptNumToDate = {}; // Lookup map for tick formatting

  sortedData.forEach((attempt, index) => {
    const attemptNum = index + 1;
    const dateStr = new Date(attempt.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    attemptNumToDate[attemptNum] = dateStr;

    const point = {
      attemptNum,
      timestamp: new Date(attempt.created_at).getTime(),
      time: attempt.inspection_time_ms / 1000,
      crossMoves: attempt.cross_moves,
      pairsAttempted: attempt.pairs_attempted,
      notes: attempt.notes,
      dateStr: new Date(attempt.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    if (attempt.cross_success) {
      successData.push(point);
    } else {
      failData.push(point);
    }
  });

  const totalAttempts = sortedData.length;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const isSuccess = payload[0].dataKey === 'time' && payload[0].fill === '#10B981';

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-xs">
        <p className="text-white font-medium mb-2">{d.dateStr}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-400">Inspection Time: {d.time.toFixed(1)}s</p>
          <p className="text-gray-300">Difficulty: {d.crossMoves} moves</p>
          <p className="text-gray-300">Pairs: {d.pairsAttempted}</p>
          <p className={d.notes ? 'text-green-400' : 'text-red-400'}>
            Result: {successData.some(s => s.timestamp === d.timestamp) ? 'Success' : 'Fail'}
          </p>
          {d.notes && (
            <p className="text-gray-400 text-xs mt-2 italic border-t border-gray-700 pt-2">
              {d.notes}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Calculate time domain
  const allTimes = [...successData, ...failData].map(d => d.time);
  const maxTime = Math.max(...allTimes);

  // Format x-axis: use attempt number but display date
  const formatAttemptDate = (attemptNum) => {
    return attemptNumToDate[attemptNum] || '';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-2">Attempts Timeline</h2>
      <p className="text-sm text-gray-400 mb-4">
        Individual attempts over time - hover for details
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              dataKey="attemptNum"
              name="Date"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[1, totalAttempts]}
              tickFormatter={formatAttemptDate}
              label={{ value: 'Date', position: 'bottom', fill: '#9CA3AF', fontSize: 12, offset: 0 }}
            />
            <YAxis
              type="number"
              dataKey="time"
              name="Inspection Time"
              unit="s"
              stroke="#9CA3AF"
              fontSize={12}
              domain={[0, Math.ceil(maxTime) + 1]}
              tickFormatter={(v) => `${v}s`}
              label={{ value: 'Inspection Time (s)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name="Success"
              data={successData}
              fill="#10B981"
              shape={(props) => {
                const { cx, cy, payload } = props;
                const fontSize = 10 + payload.crossMoves * 1.5; // Size based on difficulty
                return (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#10B981"
                    fontSize={fontSize}
                    fontWeight="bold"
                  >
                    {payload.pairsAttempted}
                  </text>
                );
              }}
            />
            <Scatter
              name="Fail"
              data={failData}
              fill="#EF4444"
              shape={(props) => {
                const { cx, cy, payload } = props;
                const fontSize = 10 + payload.crossMoves * 1.5;
                return (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#EF4444"
                    fontSize={fontSize}
                    fontWeight="bold"
                  >
                    {payload.pairsAttempted}
                  </text>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center items-center gap-4 mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="text-green-500 font-bold">3</span>
            = success
          </span>
          <span className="flex items-center gap-1">
            <span className="text-red-500 font-bold">3</span>
            = fail
          </span>
        </div>
        <span># = pairs attempted</span>
        <span>Size = difficulty</span>
      </div>
    </div>
  );
}
