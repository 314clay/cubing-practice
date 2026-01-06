import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { OverviewCards } from './OverviewCards';
import { DailyChart } from './DailyChart';
import { TimeByDifficultyChart } from './TimeByDifficultyChart';
import { DifficultyBreakdown } from './DifficultyBreakdown';
import { PairsBreakdown } from './PairsBreakdown';
import { RecentNotes } from './RecentNotes';
import { SessionHistory } from './SessionHistory';
import { PerformanceScatter } from './PerformanceScatter';
import { AttemptsTimeline } from './AttemptsTimeline';
import { getStats, getDailyStats, getTimeByDifficulty, getRecentNotes, getSessions, getSRSStats, getAttemptsScatter } from '../../api/client';
import { SRSStats } from './SRSStats';

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null },
];

export function StatsPage() {
  const [dateRange, setDateRange] = useState(DATE_RANGES[1]);
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [timeByDifficulty, setTimeByDifficulty] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [srsStats, setSrsStats] = useState(null);
  const [attemptsScatter, setAttemptsScatter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange.days
        ? new Date(Date.now() - dateRange.days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const [statsRes, dailyRes, timeRes, notesRes, sessionsRes, srsRes, scatterRes] = await Promise.all([
        getStats(dateFrom),
        getDailyStats(dateRange.days || 365),
        getTimeByDifficulty(dateFrom),
        getRecentNotes(20),
        getSessions(10),
        getSRSStats(),
        getAttemptsScatter(dateFrom, 500),
      ]);

      setStats(statsRes);
      setDailyData(dailyRes.daily || []);
      setTimeByDifficulty(timeRes.data || []);
      setRecentNotes(notesRes.attempts || []);
      setSessions(sessionsRes.sessions || []);
      setSrsStats(srsRes);
      setAttemptsScatter(scatterRes.attempts || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Header />

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                dateRange.label === range.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-400 animate-pulse">Loading stats...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <OverviewCards stats={stats} />

          <SRSStats stats={srsStats} />

          <DailyChart data={dailyData} />

          <TimeByDifficultyChart data={timeByDifficulty} />

          <div className="grid md:grid-cols-2 gap-6">
            <PerformanceScatter data={timeByDifficulty} />
            <AttemptsTimeline data={attemptsScatter} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <DifficultyBreakdown data={stats?.by_difficulty} />
            <PairsBreakdown data={stats?.by_pairs_attempted} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <RecentNotes attempts={recentNotes} />
            <SessionHistory sessions={sessions} />
          </div>
        </div>
      )}
    </div>
  );
}
