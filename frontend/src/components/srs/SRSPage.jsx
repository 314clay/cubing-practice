import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { SRSTrainer } from './SRSTrainer';
import { SRSBrowser } from './SRSBrowser';
import { SRSManager } from './SRSManager';
import { getSRSStats } from '../../api/client';

export function SRSPage() {
  const [activeTab, setActiveTab] = useState('train');
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await getSRSStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch SRS stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddToSRS = () => {
    fetchStats();
  };

  const handleReview = () => {
    fetchStats();
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Header />

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('train')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'train'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Train
            {stats?.due_today > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {stats.due_today}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'browse'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Browse Solves
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Manage
          </button>
        </div>

        {stats && (
          <div className="text-sm text-gray-400">
            {stats.total_items} items in SRS | {stats.due_today} due today
          </div>
        )}
      </div>

      {activeTab === 'train' && <SRSTrainer onReview={handleReview} />}
      {activeTab === 'browse' && <SRSBrowser onAdd={handleAddToSRS} />}
      {activeTab === 'manage' && <SRSManager onUpdate={fetchStats} />}
    </div>
  );
}
