import { useState, useRef, useCallback, useEffect } from 'react'

export function useMetronome({ bpm, beats, accent, volume = 0.85 }) {
  const [running, setRunning] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const ctxRef = useRef(null)
  const nextNoteRef = useRef(0)
  const beatRef = useRef(0)
  const beatQRef = useRef([])
  const intervalRef = useRef(null)
  const rafRef = useRef(null)

  const click = useCallback((time, isAccent) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = isAccent ? 1650 : 1100
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(volume, time + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
    o.connect(g).connect(ctx.destination)
    o.start(time)
    o.stop(time + 0.07)
  }, [volume])

  const schedule = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const spb = 60 / bpm
    while (nextNoteRef.current < ctx.currentTime + 0.12) {
      const beatInBar = beatRef.current % beats
      click(nextNoteRef.current, beatInBar === 0 && accent)
      beatQRef.current.push({ t: nextNoteRef.current, b: beatInBar })
      nextNoteRef.current += spb
      beatRef.current++
    }
  }, [bpm, beats, accent, click])

  const visualTick = useCallback(() => {
    const ctx = ctxRef.current
    if (ctx && beatQRef.current) {
      const now = ctx.currentTime
      let cur = -1
      while (beatQRef.current.length && beatQRef.current[0].t <= now) {
        cur = beatQRef.current.shift().b
      }
      if (cur >= 0) setCurrentBeat(cur)
    }
    rafRef.current = requestAnimationFrame(visualTick)
  }, [])

  const start = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!ctxRef.current) ctxRef.current = new Ctx()
    ctxRef.current.resume()
    nextNoteRef.current = ctxRef.current.currentTime + 0.06
    beatRef.current = 0
    beatQRef.current = []
    setRunning(true)
    setCurrentBeat(-1)
    intervalRef.current = setInterval(schedule, 25)
    rafRef.current = requestAnimationFrame(visualTick)
  }, [schedule, visualTick])

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setRunning(false)
    setCurrentBeat(-1)
  }, [])

  const toggle = useCallback(() => {
    if (running) stop()
    else start()
  }, [running, start, stop])

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { running, currentBeat, start, stop, toggle }
}
