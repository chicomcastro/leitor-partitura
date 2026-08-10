import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installCompat } from './compat'

// O ambiente de teste tem Node novo, onde os métodos podem já existir. Para
// medir o polyfill de verdade eles são removidos antes de cada caso e
// devolvidos depois, para não vazar entre arquivos de teste.
const originals = {}

beforeEach(() => {
  for (const name of ['getOrInsertComputed', 'getOrInsert']) {
    originals[name] = Object.getOwnPropertyDescriptor(Map.prototype, name)
    delete Map.prototype[name]
  }
})

afterEach(() => {
  for (const [name, desc] of Object.entries(originals)) {
    delete Map.prototype[name]
    if (desc) Object.defineProperty(Map.prototype, name, desc)
  }
})

describe('installCompat', () => {
  it('instala os métodos que o pdf.js espera', () => {
    expect(Map.prototype.getOrInsertComputed).toBeUndefined()
    installCompat()
    expect(typeof Map.prototype.getOrInsertComputed).toBe('function')
    expect(typeof Map.prototype.getOrInsert).toBe('function')
  })

  it('getOrInsertComputed calcula e guarda só na primeira vez', () => {
    installCompat()
    const map = new Map()
    const fn = vi.fn(k => 'v:' + k)

    expect(map.getOrInsertComputed('a', fn)).toBe('v:a')
    expect(map.getOrInsertComputed('a', fn)).toBe('v:a')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(map.get('a')).toBe('v:a')
  })

  it('getOrInsertComputed respeita um valor já presente, inclusive falsy', () => {
    installCompat()
    const map = new Map([['zero', 0], ['nulo', null]])
    const fn = vi.fn(() => 'nao deveria')

    // Um `if (!this.get(k))` ingênuo sobrescreveria os dois.
    expect(map.getOrInsertComputed('zero', fn)).toBe(0)
    expect(map.getOrInsertComputed('nulo', fn)).toBe(null)
    expect(fn).not.toHaveBeenCalled()
  })

  it('getOrInsert guarda o valor padrão só se a chave faltar', () => {
    installCompat()
    const map = new Map([['ja', 1]])
    expect(map.getOrInsert('ja', 99)).toBe(1)
    expect(map.getOrInsert('novo', 42)).toBe(42)
    expect(map.get('novo')).toBe(42)
  })

  it('não sobrescreve implementação nativa já existente', () => {
    const nativo = function () { return 'nativo' }
    Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
      value: nativo, writable: true, configurable: true,
    })
    installCompat()
    expect(Map.prototype.getOrInsertComputed).toBe(nativo)
  })

  it('é seguro chamar mais de uma vez', () => {
    installCompat()
    const primeira = Map.prototype.getOrInsertComputed
    installCompat()
    expect(Map.prototype.getOrInsertComputed).toBe(primeira)
  })

  it('instala os métodos como não-enumeráveis', () => {
    installCompat()
    const map = new Map([['a', 1]])
    // Enumerável vazaria em for..in e quebraria código alheio que percorre
    // propriedades de objetos comuns.
    expect(Object.keys(Map.prototype)).not.toContain('getOrInsertComputed')
    expect([...map.keys()]).toEqual(['a'])
  })
})
