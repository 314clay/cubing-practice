import { useEffect, useCallback } from 'react';

export function useKeyboard(handlers, deps = []) {
  const handleKeyDown = useCallback((event) => {
    // Ignore if typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      // Allow Escape to blur
      if (event.key === 'Escape') {
        event.target.blur();
        handlers.onEscape?.();
      }
      return;
    }

    switch (event.key) {
      case ' ':
        event.preventDefault();
        handlers.onSpace?.();
        break;
      case 'Enter':
        event.preventDefault();
        handlers.onEnter?.();
        break;
      case 's':
        handlers.onSuccess?.();
        break;
      case 'f':
        handlers.onFail?.();
        break;
      case 'r':
        handlers.onResetTimer?.();
        break;
      case 'n':
        event.preventDefault();
        handlers.onNotes?.();
        break;
      case 'Escape':
        handlers.onEscape?.();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
        if (event.shiftKey) {
          handlers.onPairsAttempting?.(parseInt(event.key));
        } else {
          handlers.onPairsPlanned?.(parseInt(event.key));
        }
        break;
      case '5':
      case '6':
      case '7':
        if (!event.shiftKey) {
          handlers.onDifficulty?.(parseInt(event.key));
        }
        break;
      default:
        break;
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
