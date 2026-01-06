import { useState, useEffect, useRef } from 'react';

export function Timer({ running, onTimeUpdate, resetSignal }) {
  const [time, setTime] = useState(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Reset time when resetSignal changes
  useEffect(() => {
    if (resetSignal > 0) {
      setTime(0);
      onTimeUpdate?.(null);
    }
  }, [resetSignal, onTimeUpdate]);

  const formatTime = (ms) => {
    const seconds = ms / 1000;
    return seconds.toFixed(1);
  };

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      setTime(0);

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTime(elapsed);
        onTimeUpdate?.(elapsed);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [running, onTimeUpdate]);

  return (
    <div className="text-center">
      <div className="text-6xl font-mono font-bold tabular-nums text-white">
        {formatTime(time)}s
      </div>
      <div className="text-sm text-gray-500 mt-2">
        {running ? 'Press Space to stop' : 'Press Space to start'}
      </div>
    </div>
  );
}
