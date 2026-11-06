/**
 * Runs `task` once the page is idle after its first screen, or after `timeout`
 * ms at the latest. Returns a cancel function. Background work (prefetching,
 * housekeeping requests) goes here so it never competes with the first paint.
 */
export function whenIdle(task: () => void, timeout = 2500) {
  if (typeof window === "undefined") return () => {};

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  // Safari (the iOS app) has no requestIdleCallback.
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(task, { timeout });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(task, Math.min(timeout, 1200));
  return () => window.clearTimeout(handle);
}
