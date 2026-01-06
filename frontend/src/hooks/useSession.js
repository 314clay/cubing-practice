import { useState, useEffect, useCallback, useRef } from 'react';
import { createSession, endSession as endSessionApi, getSessionAttempts } from '../api/client';

const SESSION_KEY = 'crossTrainer_activeSession';
const LAST_ACTIVITY_KEY = 'crossTrainer_lastActivity';
const AUTO_END_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

export function useSession() {
  const [session, setSession] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const autoEndingRef = useRef(false);

  // Check if session should be auto-ended due to inactivity
  const checkAutoEnd = useCallback(async (currentSession) => {
    if (!currentSession || autoEndingRef.current) return false;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed >= AUTO_END_TIMEOUT_MS) {
      autoEndingRef.current = true;
      try {
        await endSessionApi(currentSession.id, 'Auto-ended due to inactivity');
        setSession(null);
        setAttempts([]);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        return true;
      } catch (e) {
        console.error('Failed to auto-end session:', e);
      } finally {
        autoEndingRef.current = false;
      }
    }
    return false;
  }, []);

  // Load saved session and check for auto-end
  useEffect(() => {
    const loadSession = async () => {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          const wasAutoEnded = await checkAutoEnd(parsed);
          if (!wasAutoEnded) {
            setSession(parsed);
            getSessionAttempts(parsed.id)
              .then(data => setAttempts(data.attempts || []))
              .catch(console.error);
          }
        } catch (e) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        }
      }
      setLoading(false);
    };
    loadSession();
  }, [checkAutoEnd]);

  // Periodically check for auto-end while session is active
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkAutoEnd(session);
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [session, checkAutoEnd]);

  const startSession = useCallback(async () => {
    const data = await createSession();
    const newSession = data.session;
    setSession(newSession);
    setAttempts([]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    return newSession;
  }, []);

  const endSession = useCallback(async (notes) => {
    if (!session) return;
    await endSessionApi(session.id, notes);
    setSession(null);
    setAttempts([]);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  }, [session]);

  const addAttempt = useCallback((attempt) => {
    setAttempts(prev => [...prev, attempt]);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const getSessionStats = useCallback(() => {
    const total = attempts.length;
    const successful = attempts.filter(a => a.cross_success).length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    return { total, successful, successRate };
  }, [attempts]);

  return {
    session,
    attempts,
    loading,
    startSession,
    endSession,
    addAttempt,
    getSessionStats,
  };
}
