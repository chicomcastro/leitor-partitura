import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Cada documento aberto carrega o arquivo inteiro e as estruturas do pdf.js.
// A biblioteca chama getPdfDoc para toda partitura ao desenhar as miniaturas,
// então um cache sem limite acumula a coleção inteira em memória e não devolve
// nada — em tablet isso sozinho já chega perto do teto do Safari. O cache é LRU
// e os documentos que o leitor está exibindo ficam pinados para nunca serem
// despejados debaixo dele.
const MAX_CACHED_DOCS = 6

const docCache = new Map()
const pinned = new Map()

function touch(id) {
  if (!docCache.has(id)) return
  const doc = docCache.get(id)
  docCache.delete(id)
  docCache.set(id, doc)
}

// `keepId` protege o documento que está sendo entregue agora. Sem isso, quando
// as entradas mais antigas estão todas pinadas — o caso de uma playlist longa,
// em que cada peça já montada fica presa — o único candidato a descarte é
// justamente o que acabou de ser carregado: ele era destruído e devolvido
// morto, e o getPage seguinte estourava. Numa playlist isso derrubava a
// montagem a partir da peça que passava do teto do cache.
function evictIfNeeded(keepId) {
  for (const id of docCache.keys()) {
    if (docCache.size <= MAX_CACHED_DOCS) return
    if (id === keepId || pinned.has(id)) continue
    const doc = docCache.get(id)
    docCache.delete(id)
    try { doc.destroy?.() } catch { /* já destruído */ }
  }
}

export async function getPdfDoc(id, getBuffer) {
  if (docCache.has(id)) {
    touch(id)
    return docCache.get(id)
  }
  const buf = await getBuffer(id)
  if (!buf) throw new Error('pdf não encontrado')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise
  docCache.set(id, doc)
  evictIfNeeded(id)
  return doc
}

export function loadPdfFromBuffer(id, buf) {
  return pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise.then(doc => {
    docCache.set(id, doc)
    evictIfNeeded(id)
    return doc
  })
}

// O leitor pina o que está na tela (numa playlist, todas as peças concatenadas)
// para que o LRU não recolha um documento ainda em uso.
export function pinDoc(id) {
  pinned.set(id, (pinned.get(id) || 0) + 1)
}

export function unpinDoc(id) {
  const n = pinned.get(id)
  if (!n) return
  if (n <= 1) pinned.delete(id)
  else pinned.set(id, n - 1)
  evictIfNeeded()
}

export function evictDoc(id) {
  const doc = docCache.get(id)
  docCache.delete(id)
  pinned.delete(id)
  if (doc) {
    try { doc.destroy?.() } catch { /* já destruído */ }
  }
}
