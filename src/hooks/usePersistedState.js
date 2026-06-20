import { useState, useCallback } from 'react'
import { load, save } from '../lib/storage'

export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => load(key, defaultValue))

  const set = useCallback((v) => {
    setValue(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      save(key, next)
      return next
    })
  }, [key])

  return [value, set]
}
