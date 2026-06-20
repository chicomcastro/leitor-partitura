import { useState, useRef, useCallback, useEffect } from 'react'
import { idbPut, idbGet, idbDel } from '../lib/db'

export function useRecorder({ scoreId, scoreName, recordingsMeta, setRecordingsMeta }) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [playingId, setPlayingId] = useState(null)
  const mrRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = ev => { if (ev.data.size) chunksRef.current.push(ev.data) }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const id = 'rec' + Date.now()
        await idbPut('recordings', id, blob)
        const meta = { id, scoreId, name: scoreName || 'Gravação', createdAt: Date.now(), dur: elapsed, mime: blob.type }
        setRecordingsMeta(prev => [meta, ...prev])
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mrRef.current = mr
      setRecording(true)
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch {
      alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
    }
  }, [scoreId, scoreName, elapsed, setRecordingsMeta])

  const stopRec = useCallback(() => {
    clearInterval(intervalRef.current)
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop()
    setRecording(false)
  }, [])

  const toggleRec = useCallback(() => {
    if (recording) stopRec()
    else startRec()
  }, [recording, startRec, stopRec])

  const playRec = useCallback(async (rec) => {
    if (playingId === rec.id && audioRef.current) {
      audioRef.current.pause()
      setPlayingId(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    const blob = await idbGet('recordings', rec.id)
    const url = URL.createObjectURL(blob)
    audioRef.current = new Audio(url)
    audioRef.current.onended = () => setPlayingId(null)
    audioRef.current.play()
    setPlayingId(rec.id)
  }, [playingId])

  const downloadRec = useCallback(async (rec) => {
    const blob = await idbGet('recordings', rec.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ext = (rec.mime || '').includes('ogg') ? 'ogg' : (rec.mime || '').includes('mp4') ? 'm4a' : 'webm'
    a.href = url
    a.download = rec.name + ' - ' + new Date(rec.createdAt).toLocaleDateString('pt-BR') + '.' + ext
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }, [])

  const delRec = useCallback((rec) => {
    setRecordingsMeta(prev => prev.filter(r => r.id !== rec.id))
    idbDel('recordings', rec.id)
  }, [setRecordingsMeta])

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  return { recording, elapsed, playingId, toggleRec, playRec, downloadRec, delRec }
}
