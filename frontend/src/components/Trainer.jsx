import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrambleDisplay } from './ScrambleDisplay';
import { ControlPanel } from './ControlPanel';
import { Timer } from './Timer';
import { ResultInput } from './ResultInput';
import { NotesInput } from './NotesInput';
import { SessionBar } from './SessionBar';
import { Header } from './Header';
import { useSession } from '../hooks/useSession';
import { useScramble } from '../hooks/useScramble';
import { useKeyboard } from '../hooks/useKeyboard';
import { recordAttempt } from '../api/client';

const SETTINGS_KEY = 'crossTrainer_settings';

const DEFAULT_SETTINGS = {
  difficulty: 3,
  pairsAttempting: 1,
  crossColor: 'white',
};

export function Trainer() {
  const { session, loading: sessionLoading, startSession, endSession, addAttempt, getSessionStats } = useSession();
  const { scramble, loading: scrambleLoading, fetchScramble } = useScramble();
  const notesRef = useRef(null);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [timerRunning, setTimerRunning] = useState(false);
  const [inspectionTime, setInspectionTime] = useState(null);
  const [timerResetCount, setTimerResetCount] = useState(0);
  const [crossSuccess, setCrossSuccess] = useState(null);
  const [pairsPlanned, setPairsPlanned] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Load initial scramble
  useEffect(() => {
    if (!scramble && !scrambleLoading) {
      fetchScramble(settings.difficulty);
    }
  }, [scramble, scrambleLoading, fetchScramble, settings.difficulty]);

  // Fetch new scramble when difficulty changes
  const handleSettingsChange = useCallback((newSettings) => {
    if (newSettings.difficulty !== settings.difficulty) {
      fetchScramble(newSettings.difficulty);
    }
    setSettings(newSettings);
  }, [settings.difficulty, fetchScramble]);

  const resetState = useCallback(() => {
    setTimerRunning(false);
    setInspectionTime(null);
    setTimerResetCount(c => c + 1);
    setCrossSuccess(null);
    setPairsPlanned(null);
    setNotes('');
  }, []);

  const handleResetTimer = useCallback(() => {
    if (!timerRunning) {
      setInspectionTime(null);
      setTimerResetCount(c => c + 1);
    }
  }, [timerRunning]);

  const handleSubmit = useCallback(async () => {
    if (crossSuccess === null || !scramble) return;
    if (settings.pairsAttempting > 0 && pairsPlanned === null) return;

    setSubmitting(true);
    try {
      let currentSession = session;
      if (!currentSession) {
        currentSession = await startSession();
      }

      const attempt = {
        session_id: currentSession.id,
        scramble: scramble.scramble,
        cross_moves: settings.difficulty,
        cross_color: settings.crossColor,
        pairs_attempted: settings.pairsAttempting,
        cross_success: crossSuccess,
        pairs_planned: pairsPlanned || 0,
        inspection_time_ms: inspectionTime,
        used_unlimited_time: true,
        notes: notes || null,
      };

      const result = await recordAttempt(attempt);
      addAttempt({ ...attempt, ...result.attempt });

      resetState();
      fetchScramble(settings.difficulty);
    } catch (err) {
      console.error('Failed to record attempt:', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    crossSuccess,
    pairsPlanned,
    scramble,
    session,
    settings,
    inspectionTime,
    notes,
    startSession,
    addAttempt,
    resetState,
    fetchScramble,
  ]);


  // Keyboard handlers
  useKeyboard({
    onSpace: () => {
      if (timerRunning) {
        setTimerRunning(false);
      } else if (crossSuccess === null) {
        setTimerRunning(true);
      }
    },
    onEnter: () => {
      if (!timerRunning && crossSuccess !== null) {
        handleSubmit();
      }
    },
    onSuccess: () => {
      if (!timerRunning) {
        setCrossSuccess(true);
      }
    },
    onFail: () => {
      if (!timerRunning) {
        setCrossSuccess(false);
      }
    },
    onPairsPlanned: (n) => {
      if (!timerRunning && crossSuccess !== null && n <= settings.pairsAttempting) {
        setPairsPlanned(n);
      }
    },
    onPairsAttempting: (n) => {
      if (!timerRunning && n <= 4) {
        setSettings(prev => ({ ...prev, pairsAttempting: n }));
      }
    },
    onDifficulty: (n) => {
      if (!timerRunning) {
        handleSettingsChange({ ...settings, difficulty: n });
      }
    },
    onNotes: () => {
      notesRef.current?.focus();
    },
    onResetTimer: () => {
      handleResetTimer();
    },
    onEscape: () => {
      resetState();
    },
  }, [timerRunning, crossSuccess, settings, handleSubmit, handleSettingsChange, resetState, handleResetTimer]);

  const canSubmit = crossSuccess !== null &&
    (settings.pairsAttempting === 0 || pairsPlanned !== null) &&
    !submitting;

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Header />

      <SessionBar
        session={session}
        stats={getSessionStats()}
        onEndSession={() => endSession()}
        onStartSession={startSession}
      />

      <ScrambleDisplay scramble={scramble} loading={scrambleLoading} />

      <ControlPanel settings={settings} onChange={handleSettingsChange} />

      <div className="bg-gray-800 rounded-lg p-6">
        <Timer
          running={timerRunning}
          onTimeUpdate={setInspectionTime}
          resetSignal={timerResetCount}
        />
        {!timerRunning && inspectionTime !== null && (
          <div className="text-center mt-3">
            <button
              onClick={handleResetTimer}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Reset Timer (R)
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-center text-gray-300">Results</h2>

        <ResultInput
          crossSuccess={crossSuccess}
          pairsPlanned={pairsPlanned}
          pairsAttempting={settings.pairsAttempting}
          onCrossSuccess={setCrossSuccess}
          onPairsPlanned={setPairsPlanned}
        />

        <NotesInput ref={notesRef} value={notes} onChange={setNotes} />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-lg font-medium text-lg transition-all ${
            canSubmit
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Saving...' : 'Submit & Next (Enter)'}
        </button>
      </div>

      <footer className="text-center text-sm text-gray-600">
        <div className="space-x-4">
          <span>Space: Start/Stop Timer</span>
          <span>R: Reset Timer</span>
          <span>S/F: Success/Fail</span>
          <span>0-4: Pairs Planned</span>
          <span>Enter: Submit</span>
        </div>
      </footer>
    </div>
  );
}
