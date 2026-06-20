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

  const loadAnnotationsWithOffset = useCallback(async (scoreId, offset) => {
    const saved = await idbGet('pdfs', `ann_${scoreId}`)
    if (saved) {
      for (const [page, data] of saved) {
        mapRef.current.set(page + offset, data)
      }
    }
    bump(n => n + 1)
  }, [])

  const saveAnnotations = useCallback(async (scoreId) => {
    const entries = Array.from(mapRef.current.entries())
    await idbPut('pdfs', `ann_${scoreId}`, entries)
  }, [])

  const saveAnnotationsForRange = useCallback(async (scoreId, offset, count) => {
    const entries = []
    for (let p = offset + 1; p <= offset + count; p++) {
      const data = mapRef.current.get(p)
      if (data) entries.push([p - offset, data])
    }
    await idbPut('pdfs', `ann_${scoreId}`, entries)
  }, [])

  const clearMap = useCallback(() => {
    mapRef.current.clear()
    bump(n => n + 1)
  }, [])

  const getPageAnnotation = useCallback((pageNum) => {
    return mapRef.current.get(pageNum) || null
  }, [])

  const setPageAnnotation = useCallback((pageNum, dataUrl) => {
    mapRef.current.set(pageNum, dataUrl)
    bump(n => n + 1)
  }, [])

  return {
    loadAnnotations, loadAnnotationsWithOffset,
    saveAnnotations, saveAnnotationsForRange,
    clearMap, getPageAnnotation, setPageAnnotation,
  }
}
