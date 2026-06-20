import { useState, useCallback, useRef } from 'react'
import { idbGet, idbPut } from '../lib/db'

export function useAnnotations() {
  const mapRef = useRef(new Map())
  const [, bump] = useState(0)

  const loadAnnotations = useCallback(async (scoreId) => {
    const saved = await idbGet('pdfs', `ann_${scoreId}`)
    mapRef.current = new Map(saved || [])
    bump(n => n + 1)
  }, [])

  const saveAnnotations = useCallback(async (scoreId) => {
    const entries = Array.from(mapRef.current.entries())
    await idbPut('pdfs', `ann_${scoreId}`, entries)
  }, [])

  const getPageAnnotation = useCallback((pageNum) => {
    return mapRef.current.get(pageNum) || null
  }, [])

  const setPageAnnotation = useCallback((pageNum, dataUrl) => {
    mapRef.current.set(pageNum, dataUrl)
    bump(n => n + 1)
  }, [])

  return { loadAnnotations, saveAnnotations, getPageAnnotation, setPageAnnotation }
}
