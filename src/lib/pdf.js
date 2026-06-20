import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const docCache = new Map()

export async function getPdfDoc(id, getBuffer) {
  if (docCache.has(id)) return docCache.get(id)
  const buf = await getBuffer(id)
  if (!buf) throw new Error('pdf não encontrado')
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise
  docCache.set(id, doc)
  return doc
}

export function loadPdfFromBuffer(id, buf) {
  return pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise.then(doc => {
    docCache.set(id, doc)
    return doc
  })
}

export function evictDoc(id) {
  docCache.delete(id)
}
