// Gera um PDF válido com N páginas, sem depender de nenhuma biblioteca.
// Serve para exercitar o leitor de verdade no e2e: o caminho que estourava a
// memória só aparece com um documento longo, renderizado página a página.
//
// A função é escrita como texto e injetada no browser (page.addInitScript),
// então precisa se manter autocontida e sem imports.
export function makePdfSource() {
  return `
window.__makePdf = function (pages) {
  const objects = []
  const push = (body) => { objects.push(body); return objects.length }

  // 1 = catálogo, 2 = árvore de páginas (preenchidos no fim, quando já se
  // conhece os números das páginas).
  push(null)
  push(null)

  const pageIds = []
  for (let p = 1; p <= pages; p++) {
    // Conteúdo só vetorial, de propósito: texto exigiria standardFontDataUrl,
    // que o app não configura, e um erro de fonte falharia o render por um
    // motivo que não tem nada a ver com o que este teste mede. As barras variam
    // por página, então cada uma rasteriza para pixels diferentes.
    const bar = 40 + (p % 5) * 90
    const content = [
      '0.1 0.1 0.1 rg 0 0 595 842 re f',
      '0.9 0.3 0.3 rg 72 ' + (700 - bar) + ' ' + (60 + bar) + ' ' + bar + ' re f',
      '0.2 0.6 0.9 rg 72 200 450 40 re f',
    ].join('\\n')
    const streamId = push('<< /Length ' + content.length + ' >>\\nstream\\n' + content + '\\nendstream')
    pageIds.push(push(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << >> /Contents ' + streamId + ' 0 R >>'
    ))
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = '<< /Type /Pages /Count ' + pages +
    ' /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] >>'

  // Montagem com xref: o pdf.js aceita arquivos quebrados reconstruindo a
  // tabela, mas aí o teste estaria medindo o modo de recuperação, não o normal.
  let pdf = '%PDF-1.4\\n'
  const offsets = []
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length)
    pdf += (i + 1) + ' 0 obj\\n' + objects[i] + '\\nendobj\\n'
  }

  const xrefStart = pdf.length
  pdf += 'xref\\n0 ' + (objects.length + 1) + '\\n'
  pdf += '0000000000 65535 f \\n'
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \\n'
  }
  pdf += 'trailer\\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\\n'
  pdf += 'startxref\\n' + xrefStart + '\\n%%EOF\\n'

  // Latin-1: o conteúdo é todo ASCII, então byte a byte é fiel.
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff
  return bytes.buffer
}
`
}
