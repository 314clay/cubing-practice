import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer', () => {
  it('renders initial time as 0.0s', () => {
    render(<Timer running={false} />);

    expect(screen.getByText('0.0s')).toBeInTheDocument();
  });

  it('shows "Press Space to start" when not running', () => {
    render(<Timer running={false} />);

    expect(screen.getByText('Press Space to start')).toBeInTheDocument();
  });

  it('shows "Press Space to stop" when running', () => {
    render(<Timer running={true} />);

    expect(screen.getByText('Press Space to stop')).toBeInTheDocument();
  });

  it('calls onTimeUpdate when running', async () => {
    vi.useFakeTimers();
    const onTimeUpdate = vi.fn();

    render(<Timer running={true} onTimeUpdate={onTimeUpdate} />);

    vi.advanceTimersByTime(200);

    expect(onTimeUpdate).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
