export function load(key, defaultValue) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : defaultValue
  } catch {
    return defaultValue
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded — silent */ }
}
