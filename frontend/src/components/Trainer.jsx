import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrambleDisplay } from './ScrambleDisplay';
import { ControlPanel } from './ControlPanel';
import { Timer } from './Timer';
import { ResultInput } from './ResultInput';
import { NotesInput } from './NotesInput';
import { SessionBar } from './SessionBar';
import { Header } from './Header';
import { RecentSolves } from './RecentSolves';
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
  const { session, attempts, loading: sessionLoading, startSession, endSession, addAttempt, removeAttempt, getSessionStats } = useSession();
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

  // Timer phases: 'idle' | 'inspection_running' | 'inspection_done' | 'execution_running' | 'done'
  const [timerPhase, setTimerPhase] = useState('idle');
  const [inspectionTime, setInspectionTime] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);
  const [inspectionResetCount, setInspectionResetCount] = useState(0);
  const [executionResetCount, setExecutionResetCount] = useState(0);
  const [crossSuccess, setCrossSuccess] = useState(null);
  const [blindfolded, setBlindfolded] = useState(false);
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
    setTimerPhase('idle');
    setInspectionTime(null);
    setExecutionTime(null);
    setInspectionResetCount(c => c + 1);
    setExecutionResetCount(c => c + 1);
    setCrossSuccess(null);
    setBlindfolded(false);
    setPairsPlanned(null);
    setNotes('');
  }, []);

  const handleResetTimer = useCallback(() => {
    const isTimerRunning = timerPhase === 'inspection_running' || timerPhase === 'execution_running';
    if (!isTimerRunning) {
      setTimerPhase('idle');
      setInspectionTime(null);
      setExecutionTime(null);
      setInspectionResetCount(c => c + 1);
      setExecutionResetCount(c => c + 1);
    }
  }, [timerPhase]);

  const handleSubmit = useCallback(async (forceNullTime = false) => {
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
        inspection_time_ms: forceNullTime ? null : inspectionTime,
        execution_time_ms: forceNullTime ? null : executionTime,
        used_unlimited_time: true,
        blindfolded: blindfolded,
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
    blindfolded,
    pairsPlanned,
    scramble,
    session,
    settings,
    inspectionTime,
    executionTime,
    notes,
    startSession,
    addAttempt,
    resetState,
    fetchScramble,
  ]);


  // Keyboard handlers
  const isTimerRunning = timerPhase === 'inspection_running' || timerPhase === 'execution_running';

  useKeyboard({
    onSpace: () => {
      // Phase state machine for space key
      switch (timerPhase) {
        case 'idle':
          setTimerPhase('inspection_running');
          break;
        case 'inspection_running':
          setTimerPhase('inspection_done');
          break;
        case 'inspection_done':
          setTimerPhase('execution_running');
          break;
        case 'execution_running':
          setTimerPhase('done');
          break;
        case 'done':
          // No further transitions from done
          break;
      }
    },
    onEnter: () => {
      if (!isTimerRunning && crossSuccess !== null) {
        handleSubmit();
      }
    },
    onSuccess: () => {
      if (!isTimerRunning) {
        setCrossSuccess(true);
        setBlindfolded(false);
        if (settings.pairsAttempting > 0) {
          setPairsPlanned(settings.pairsAttempting);
        }
      }
    },
    onBlind: () => {
      if (!isTimerRunning) {
        setCrossSuccess(true);
        setBlindfolded(true);
        if (settings.pairsAttempting > 0) {
          setPairsPlanned(settings.pairsAttempting);
        }
      }
    },
    onFail: () => {
      if (!isTimerRunning) {
        setCrossSuccess(false);
        setBlindfolded(false);
        if (settings.pairsAttempting > 0) {
          setPairsPlanned(0);
        }
      }
    },
    onPairsPlanned: (n) => {
      // Allow up to 4 pairs (beyond pairsAttempting for bonus)
      if (!isTimerRunning && n <= 4 && settings.pairsAttempting > 0) {
        setPairsPlanned(n);
        // Auto-set cross result if not already set
        if (crossSuccess === null) {
          if (n >= settings.pairsAttempting) {
            // Hit target or exceeded = success
            setCrossSuccess(true);
            setBlindfolded(false);
          } else {
            // Less than target = failure
            setCrossSuccess(false);
            setBlindfolded(false);
          }
        }
      }
    },
    onPairsAttempting: (n) => {
      if (!isTimerRunning && n <= 4) {
        setSettings(prev => ({ ...prev, pairsAttempting: n }));
      }
    },
    onDifficulty: (n) => {
      if (!isTimerRunning) {
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
  }, [timerPhase, isTimerRunning, crossSuccess, settings, handleSubmit, handleSettingsChange, resetState, handleResetTimer]);

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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-6 max-w-4xl">
          <Header />

          <SessionBar
            session={session}
            stats={getSessionStats()}
            onEndSession={() => endSession()}
            onStartSession={startSession}
          />

          <ScrambleDisplay scramble={scramble} loading={scrambleLoading} />

          <ControlPanel settings={settings} onChange={handleSettingsChange} />

          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            {/* Inspection Timer */}
            <Timer
              running={timerPhase === 'inspection_running'}
              onTimeUpdate={setInspectionTime}
              resetSignal={inspectionResetCount}
              label="Inspection"
              hint={timerPhase === 'idle' ? 'Press Space to start' :
                    timerPhase === 'inspection_running' ? 'Press Space to stop' : null}
            />

            {/* Execution Timer - only show after inspection is done */}
            {(timerPhase === 'inspection_done' || timerPhase === 'execution_running' || timerPhase === 'done') && (
              <Timer
                running={timerPhase === 'execution_running'}
                onTimeUpdate={setExecutionTime}
                resetSignal={executionResetCount}
                label="Execution"
                hint={timerPhase === 'inspection_done' ? 'Press Space to start execution timer (optional)' :
                      timerPhase === 'execution_running' ? 'Press Space to stop' : null}
              />
            )}

            {/* Reset button */}
            {!isTimerRunning && (inspectionTime !== null || executionTime !== null) && (
              <div className="text-center mt-3">
                <button
                  onClick={handleResetTimer}
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Reset Timers (R)
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-semibold text-center text-gray-300">Results</h2>

            <ResultInput
              crossSuccess={crossSuccess}
              blindfolded={blindfolded}
              pairsPlanned={pairsPlanned}
              pairsAttempting={settings.pairsAttempting}
              onCrossSuccess={setCrossSuccess}
              onBlindfolded={setBlindfolded}
              onPairsPlanned={setPairsPlanned}
            />

            <NotesInput ref={notesRef} value={notes} onChange={setNotes} />

            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={!canSubmit}
                className={`flex-1 py-4 rounded-lg font-medium text-lg transition-all ${
                  canSubmit
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Saving...' : 'Submit & Next (Enter)'}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={!canSubmit}
                className={`py-4 px-4 rounded-lg font-medium text-sm transition-all ${
                  canSubmit
                    ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title="Submit without recording time"
              >
                No Time
              </button>
            </div>
          </div>

          <footer className="text-center text-sm text-gray-600">
            <div className="space-x-4">
              <span>Space: Start/Stop Timers</span>
              <span>R: Reset</span>
              <span>S/F: Success/Fail</span>
              <span>0-4: Pairs</span>
              <span>Enter: Submit</span>
            </div>
          </footer>
        </div>

        {/* Sidebar - Recent Solves */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-4">
            <RecentSolves attempts={attempts} onDelete={removeAttempt} />
          </div>
        </div>
      </div>
    </div>
  );
}
