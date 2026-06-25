import { useEffect, useRef } from 'react'

const IDLE_MS = 60_000   // pause counting after 1 min without interaction
const TICK_MS = 5_000
const FLUSH_MS = 15_000  // commit accumulated time at least this often

// Tracks "honest" practice time while `active` and the tab is visible and the
// user has interacted recently. Calls the stable `onPractice(ms)` periodically
// and on teardown. `onPractice` must be referentially stable (useCallback) so
// the tracking effect isn't reset on every render. See ADR 020.
export function usePracticeTracker({ active, onPractice }) {
  useEffect(() => {
    if (!active) return
    let acc = 0
    let lastTick = Date.now()
    let lastInteraction = Date.now()

    const bump = () => { lastInteraction = Date.now() }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach(e => window.addEventListener(e, bump, { passive: true }))

    const flush = () => { if (acc > 0) { onPractice(acc); acc = 0 } }

    const tick = () => {
      const now = Date.now()
      const dt = now - lastTick
      lastTick = now
      const activeNow = !document.hidden && (now - lastInteraction) < IDLE_MS
      // Guard against large gaps (sleep / background) inflating the count.
      if (activeNow && dt > 0 && dt < IDLE_MS) acc += dt
      if (acc >= FLUSH_MS) flush()
    }

    const interval = setInterval(tick, TICK_MS)
    const onVisibility = () => { tick(); if (document.hidden) flush() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      tick()
      flush()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      events.forEach(e => window.removeEventListener(e, bump))
    }
  }, [active, onPractice])
}
