import { useEffect, useCallback, useRef } from 'react';

export function useKeyboard(handlers, deps = []) {
  // Track if space is currently held down to prevent repeat events
  const spaceHeldRef = useRef(false);

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
        // Prevent page scroll, but don't trigger action on keydown
        event.preventDefault();
        // Mark space as held to prevent repeat events
        spaceHeldRef.current = true;
        break;
      case 'Enter':
        event.preventDefault();
        handlers.onEnter?.();
        break;
      case 's':
        handlers.onSuccess?.();
        break;
      case 'b':
        handlers.onBlind?.();
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
      case '`':
        // Backtick as alias for 0 (convenient location next to 1)
        handlers.onPairsPlanned?.(0);
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

  const handleKeyUp = useCallback((event) => {
    // Ignore if typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key === ' ') {
      // Only trigger if we weren't in a repeat cycle
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false;
        handlers.onSpace?.();
      }
    }
  }, [handlers, ...deps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
