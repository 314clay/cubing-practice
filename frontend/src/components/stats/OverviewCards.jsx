export function OverviewCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Total Attempts', value: stats.total_attempts },
    { label: 'Success Rate', value: `${stats.overall_cross_success_rate}%`, color: getSuccessColor(stats.overall_cross_success_rate) },
    { label: 'Sessions', value: stats.total_sessions },
    { label: 'Avg Inspection', value: stats.avg_inspection_time_ms ? `${(stats.avg_inspection_time_ms / 1000).toFixed(1)}s` : '-' },
    stats.avg_inspection_time_ms_successful != null && {
      label: 'Avg Inspection (Success)',
      value: `${(stats.avg_inspection_time_ms_successful / 1000).toFixed(1)}s`
    },
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-gray-800 rounded-lg p-4 text-center">
          <div className={`text-3xl font-bold ${card.color || 'text-white'}`}>
            {card.value}
          </div>
          <div className="text-sm text-gray-400 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function getSuccessColor(rate) {
  if (rate >= 80) return 'text-green-400';
  if (rate >= 50) return 'text-yellow-400';
  return 'text-red-400';
}
