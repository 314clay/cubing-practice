import { useState, useEffect, useCallback } from 'react';
import { getSRSDue, getSRSSolution, recordSRSReview } from '../../api/client';
import { SolutionReveal } from './SolutionReveal';

const DEPTH_LABELS = {
  0: 'Cross only',
  1: 'Cross + 1 pair',
  2: 'Cross + 2 pairs',
  3: 'Cross + 3 pairs',
};

const QUALITY_LABELS = [
  { value: 0, label: '0', description: 'Blackout' },
  { value: 1, label: '1', description: 'Wrong' },
  { value: 2, label: '2', description: 'Hard' },
  { value: 3, label: '3', description: 'Okay' },
  { value: 4, label: '4', description: 'Good' },
  { value: 5, label: '5', description: 'Perfect' },
];

export function SRSTrainer({ onReview }) {
  const [selectedDepth, setSelectedDepth] = useState(null);
  const [dueItems, setDueItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [solution, setSolution] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeReset, setTimeReset] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const fetchDueItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSRSDue(selectedDepth, 50);
      setDueItems(data.items);
      if (data.items.length > 0) {
        setCurrentItem(data.items[0]);
        setStartTime(Date.now());
      } else {
        setCurrentItem(null);
      }
      setShowSolution(false);
      setSolution(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to fetch due items:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDepth]);

  useEffect(() => {
    fetchDueItems();
  }, [fetchDueItems]);

  const handleShowSolution = async () => {
    if (!currentItem) return;
    try {
      const data = await getSRSSolution(currentItem.id, currentItem.depth);
      setSolution(data);
      setShowSolution(true);
    } catch (err) {
      console.error('Failed to fetch solution:', err);
    }
  };

  const handleRating = async (quality) => {
    if (!currentItem || submitting) return;

    setSubmitting(true);
    const responseTime = startTime ? Date.now() - startTime : null;

    try {
      await recordSRSReview(currentItem.id, quality, responseTime, notes);
      onReview?.();
      // Move to next item
      const remainingItems = dueItems.filter(item => item.id !== currentItem.id);
      setDueItems(remainingItems);
      if (remainingItems.length > 0) {
        setCurrentItem(remainingItems[0]);
        setStartTime(Date.now());
      } else {
        setCurrentItem(null);
      }
      setShowSolution(false);
      setSolution(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to record review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !showSolution && currentItem) {
        e.preventDefault();
        handleShowSolution();
      } else if (showSolution && e.key >= '0' && e.key <= '5') {
        handleRating(parseInt(e.key, 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSolution, currentItem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">All caught up!</h2>
        <p className="text-gray-400 mb-6">
          No items due for review. Browse solves to add more to your SRS.
        </p>
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map(depth => (
            <button
              key={depth}
              onClick={() => setSelectedDepth(selectedDepth === depth ? null : depth)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedDepth === depth
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Depth {depth}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Depth filter */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400">Filter by depth:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDepth(null)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              selectedDepth === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {[0, 1, 2, 3].map(depth => (
            <button
              key={depth}
              onClick={() => setSelectedDepth(depth)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedDepth === depth
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {depth}
            </button>
          ))}
        </div>
        <span className="text-gray-500 text-sm">
          ({dueItems.length} due)
        </span>
      </div>

      {/* Current item */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-sm text-blue-400 font-medium">
              {DEPTH_LABELS[currentItem.depth]}
            </span>
            <h2 className="text-lg font-semibold mt-1">
              {currentItem.solver} - {currentItem.result}s
            </h2>
            <p className="text-sm text-gray-400">{currentItem.competition}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Rep: {currentItem.repetitions}</div>
            <div>Interval: {currentItem.interval_days}d</div>
            <div>Ease: {parseFloat(currentItem.ease_factor).toFixed(2)}</div>
          </div>
        </div>

        {/* Scramble */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <code className="text-lg text-white font-mono break-words">
            {currentItem.scramble}
          </code>
        </div>

        {/* Solution reveal */}
        {!showSolution ? (
          <button
            onClick={handleShowSolution}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg transition-colors"
          >
            Show Solution (Space)
          </button>
        ) : (
          <>
            <SolutionReveal solution={solution} depth={currentItem.depth} />

            {/* Rating buttons */}
            <div className="mt-6">
              <p className="text-center text-gray-400 mb-4">
                Rate your recall (0-5):
              </p>
              <div className="grid grid-cols-6 gap-2">
                {QUALITY_LABELS.map(({ value, label, description }) => (
                  <button
                    key={value}
                    onClick={() => handleRating(value)}
                    disabled={submitting}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      value < 3
                        ? 'bg-red-900 hover:bg-red-800 text-red-200'
                        : 'bg-green-900 hover:bg-green-800 text-green-200'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xl">{label}</div>
                    <div className="text-xs opacity-75">{description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this review..."
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <footer className="text-center text-sm text-gray-600">
        <span>Space: Show Solution</span>
        <span className="mx-4">0-5: Rate Recall</span>
      </footer>
    </div>
  );
}
