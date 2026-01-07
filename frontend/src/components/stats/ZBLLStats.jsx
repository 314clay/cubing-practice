import { useState, useEffect } from 'react';
import { getZBLLStats, getZBLLDaily, getZBLLCases, getZBLLProgress } from '../../api/client';

const ZBLL_SET_COLORS = {
  T: '#3b82f6',   // blue
  U: '#8b5cf6',   // purple
  L: '#10b981',   // green
  H: '#f59e0b',   // amber
  Pi: '#ef4444',  // red
  S: '#ec4899',   // pink
  AS: '#06b6d4',  // cyan
};

function formatTime(ms) {
  if (!ms) return '-';
  return (ms / 1000).toFixed(2) + 's';
}

export function ZBLLStats({ dateRange }) {
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [weakestCases, setWeakestCases] = useState([]);
  const [strongestCases, setStrongestCases] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const dateFrom = dateRange?.days
          ? new Date(Date.now() - dateRange.days * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

        const [statsRes, dailyRes, weakestRes, strongestRes, progressRes] = await Promise.all([
          getZBLLStats(dateFrom),
          getZBLLDaily(dateRange?.days || 365),
          getZBLLCases('avg_ms', 'desc', 3, 10),
          getZBLLCases('avg_ms', 'asc', 3, 10),
          getZBLLProgress(),
        ]);

        setStats(statsRes);
        setDailyData(dailyRes.daily || []);
        setWeakestCases(weakestRes.cases || []);
        setStrongestCases(strongestRes.cases || []);
        setProgress(progressRes.progress || []);
      } catch (err) {
        console.error('Failed to fetch ZBLL stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400 animate-pulse">Loading ZBLL stats...</div>
      </div>
    );
  }

  if (!stats || stats.total_solves === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">ZBLL Practice</h2>
        <p className="text-gray-400">
          No ZBLL practice data yet. Start the sync server and practice on{' '}
          <a
            href="https://bestsiteever.net/zbll/#/timer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            bestsiteever.net/zbll
          </a>
          !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Solves</div>
          <div className="text-2xl font-bold">{stats.total_solves.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Average</div>
          <div className="text-2xl font-bold">{formatTime(stats.avg_ms)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Best</div>
          <div className="text-2xl font-bold text-green-400">{formatTime(stats.best_ms)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Cases Practiced</div>
          <div className="text-2xl font-bold">{stats.unique_cases}</div>
        </div>
      </div>

      {/* Stats by Set */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">By ZBLL Set</h3>
        <div className="space-y-3">
          {stats.by_set.map((set) => (
            <div key={set.zbll_set} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: ZBLL_SET_COLORS[set.zbll_set] || '#6b7280' }}
              >
                {set.zbll_set}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{set.count} solves</span>
                  <span className="text-gray-400">avg: {formatTime(set.avg_ms)}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (set.count / Math.max(...stats.by_set.map(s => s.count))) * 100)}%`,
                      backgroundColor: ZBLL_SET_COLORS[set.zbll_set] || '#6b7280',
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-green-400 w-16 text-right">
                {formatTime(set.best_ms)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weakest & Strongest Cases */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Weakest Cases</h3>
          <div className="space-y-2">
            {weakestCases.map((c, i) => (
              <div key={c.case_key} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-5">{i + 1}.</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: ZBLL_SET_COLORS[c.zbll_set] || '#6b7280',
                    color: 'white',
                  }}
                >
                  {c.zbll_set}
                </span>
                <span className="flex-1 font-mono">{c.case_key}</span>
                <span className="text-gray-400">{c.count} solves</span>
                <span className="text-red-400 font-medium w-16 text-right">
                  {formatTime(c.avg_ms)}
                </span>
              </div>
            ))}
            {weakestCases.length === 0 && (
              <p className="text-gray-500 text-sm">Need at least 3 solves per case</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-400">Strongest Cases</h3>
          <div className="space-y-2">
            {strongestCases.map((c, i) => (
              <div key={c.case_key} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-5">{i + 1}.</span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: ZBLL_SET_COLORS[c.zbll_set] || '#6b7280',
                    color: 'white',
                  }}
                >
                  {c.zbll_set}
                </span>
                <span className="flex-1 font-mono">{c.case_key}</span>
                <span className="text-gray-400">{c.count} solves</span>
                <span className="text-green-400 font-medium w-16 text-right">
                  {formatTime(c.avg_ms)}
                </span>
              </div>
            ))}
            {strongestCases.length === 0 && (
              <p className="text-gray-500 text-sm">Need at least 3 solves per case</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Activity */}
      {dailyData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Practice</h3>
          <div className="h-40 flex items-end gap-1">
            {dailyData.slice(0, 30).reverse().map((day) => {
              const maxSolves = Math.max(...dailyData.map(d => d.solves));
              const height = (day.solves / maxSolves) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-400 transition-colors cursor-pointer group relative"
                  style={{ height: `${Math.max(4, height)}%` }}
                  title={`${day.date}: ${day.solves} solves, avg ${formatTime(day.avg_ms)}`}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {day.solves} solves
                    <br />
                    avg: {formatTime(day.avg_ms)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Progress Chart */}
      {progress.length > 10 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Progress (Rolling Average)</h3>
          <div className="h-48 flex items-end gap-px">
            {progress.map((p, i) => {
              const maxAvg = Math.max(...progress.map(x => x.rolling_avg_50));
              const minAvg = Math.min(...progress.map(x => x.rolling_avg_50));
              const range = maxAvg - minAvg || 1;
              const height = ((p.rolling_avg_50 - minAvg) / range) * 80 + 10;
              return (
                <div
                  key={i}
                  className="flex-1 bg-purple-500 rounded-t opacity-70 hover:opacity-100"
                  style={{ height: `${height}%` }}
                  title={`Solve #${p.solve_num}: ${formatTime(p.rolling_avg_50)} (Ao50)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>First</span>
            <span>Ao50 over time</span>
            <span>Latest</span>
          </div>
        </div>
      )}
    </div>
  );
}
