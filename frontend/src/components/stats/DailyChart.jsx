import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export function DailyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Progress</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data yet. Start practicing to see your progress!
        </div>
      </div>
    );
  }

  const chartData = [...data].reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    attempts: d.attempts,
    successRate: d.success_rate,
    avgTime: d.avg_inspection_time_ms ? d.avg_inspection_time_ms / 1000 : null,
  }));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Daily Progress</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
            <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                    <p className="text-white font-medium mb-2">{label}</p>
                    {payload.map((entry, idx) => (
                      <p key={idx} style={{ color: entry.color }} className="text-sm">
                        {entry.name}: {entry.name === 'Avg Time' ? `${entry.value?.toFixed(1)}s` : entry.value}
                        {entry.name === 'Success %' && '%'}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="attempts" fill="#3B82F6" name="Attempts" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10B981" strokeWidth={2} name="Success %" dot={{ fill: '#10B981' }} />
            <Line yAxisId="left" type="monotone" dataKey="avgTime" stroke="#F59E0B" strokeWidth={2} name="Avg Time" dot={{ fill: '#F59E0B' }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
