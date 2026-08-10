import { describe, it, expect, vi, beforeEach } from 'vitest'

// pdf.js real puxa o worker e um parser de verdade; aqui só interessa a
// política de cache, então o módulo é trocado por um stub que conta parses.
const parses = []
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: ({ data }) => {
    const id = new TextDecoder().decode(data)
    parses.push(id)
    return { promise: Promise.resolve({ id, destroyed: false, destroy() { this.destroyed = true } }) }
  },
}))

const { getPdfDoc, pinDoc, unpinDoc, evictDoc } = await import('./pdf')

const buf = (id) => new TextEncoder().encode(id).buffer
const getBuffer = (id) => Promise.resolve(buf(id))

beforeEach(() => { parses.length = 0 })

describe('cache de documentos do pdf.js', () => {
  it('reaproveita o documento já aberto sem parsear de novo', async () => {
    const a = await getPdfDoc('reuse', getBuffer)
    const b = await getPdfDoc('reuse', getBuffer)
    expect(a).toBe(b)
    expect(parses).toEqual(['reuse'])
    evictDoc('reuse')
  })

  it('descarta os menos usados acima do limite, destruindo o documento', async () => {
    const docs = []
    for (let i = 0; i < 8; i++) docs.push(await getPdfDoc('lru' + i, getBuffer))

    // Os dois primeiros saíram para caber os oito num cache de seis.
    expect(docs[0].destroyed).toBe(true)
    expect(docs[1].destroyed).toBe(true)
    expect(docs[7].destroyed).toBe(false)

    // E reabrir um despejado custa um parse novo.
    parses.length = 0
    await getPdfDoc('lru0', getBuffer)
    expect(parses).toEqual(['lru0'])

    for (let i = 0; i < 8; i++) evictDoc('lru' + i)
  })

  it('nunca despeja um documento pinado, mesmo sendo o mais antigo', async () => {
    const held = await getPdfDoc('pinned', getBuffer)
    pinDoc('pinned')
    for (let i = 0; i < 10; i++) await getPdfDoc('outro' + i, getBuffer)

    expect(held.destroyed).toBe(false)
    parses.length = 0
    expect(await getPdfDoc('pinned', getBuffer)).toBe(held)
    expect(parses).toEqual([])

    unpinDoc('pinned')
    for (let i = 0; i < 10; i++) evictDoc('outro' + i)
    evictDoc('pinned')
  })

  it('depois de despinado volta a ser descartável', async () => {
    const doc = await getPdfDoc('solto', getBuffer)
    pinDoc('solto')
    unpinDoc('solto')
    for (let i = 0; i < 10; i++) await getPdfDoc('enche' + i, getBuffer)
    expect(doc.destroyed).toBe(true)
    for (let i = 0; i < 10; i++) evictDoc('enche' + i)
  })

  it('conta pinos aninhados: a mesma peça em duas playlists', async () => {
    const doc = await getPdfDoc('dupla', getBuffer)
    pinDoc('dupla')
    pinDoc('dupla')
    unpinDoc('dupla')
    for (let i = 0; i < 10; i++) await getPdfDoc('x' + i, getBuffer)
    expect(doc.destroyed).toBe(false)

    unpinDoc('dupla')
    for (let i = 0; i < 10; i++) await getPdfDoc('y' + i, getBuffer)
    expect(doc.destroyed).toBe(true)
  })
})

describe('cache não pode destruir o que acabou de carregar', () => {
  it('devolve documento vivo mesmo com o cache cheio de pinados', async () => {
    // Cenário da playlist grande: as peças já montadas ficam pinadas, então
    // quando a próxima chega o único candidato a descarte é ela mesma.
    for (let i = 0; i < 6; i++) {
      await getPdfDoc('fix' + i, getBuffer)
      pinDoc('fix' + i)
    }

    const nova = await getPdfDoc('setima', getBuffer)
    expect(nova.destroyed).toBe(false)

    // E segue no cache: pedir de novo não pode reparsear nem trazer outro
    // objeto, senão as páginas já obtidas apontariam para um documento morto.
    parses.length = 0
    expect(await getPdfDoc('setima', getBuffer)).toBe(nova)
    expect(parses).toEqual([])

    for (let i = 0; i < 6; i++) { unpinDoc('fix' + i); evictDoc('fix' + i) }
    evictDoc('setima')
  })
})
