// O pdf.js 5.6 usa Map.prototype.getOrInsertComputed, um método de proposta
// recente que só existe em navegadores muito novos. Onde ele falta, o pdf.js
// lança no meio da montagem do leitor — o que não quebra a página inteira,
// porque o render de cada página é disparado pelo IntersectionObserver, mas
// derruba silenciosamente o resto da montagem (ir para a peça clicada numa
// playlist, carregar as anotações).
//
// Um tablet não atualiza o Safari na mesma velocidade que um desktop, e o app
// se propõe a funcionar offline em tablet, então vale carregar o polyfill em
// vez de exigir a versão mais recente do navegador.
export function installCompat() {
  if (typeof Map !== 'undefined' && !Map.prototype.getOrInsertComputed) {
    Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
      value: function getOrInsertComputed(key, callbackFn) {
        if (!this.has(key)) this.set(key, callbackFn(key))
        return this.get(key)
      },
      writable: true,
      configurable: true,
    })
  }

  if (typeof Map !== 'undefined' && !Map.prototype.getOrInsert) {
    Object.defineProperty(Map.prototype, 'getOrInsert', {
      value: function getOrInsert(key, value) {
        if (!this.has(key)) this.set(key, value)
        return this.get(key)
      },
      writable: true,
      configurable: true,
    })
  }
}
