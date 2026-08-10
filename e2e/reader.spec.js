import { test, expect } from '@playwright/test'
import { makePdfSource } from './fixtures/makePdf.js'

// Estes testes cobrem o buraco deixado pela correção de memória do leitor: a
// suíte antiga parava na Library e nunca abria uma partitura de verdade, então
// nada impedia o retorno do bug que derrubava a aba no iPad.
//
// O que se mede aqui não é "renderizou bonito", e sim a invariante que a
// correção estabeleceu: o número de canvases vivos acompanha a janela visível,
// não o tamanho do documento. Antes da correção uma partitura de 30 páginas
// mantinha 60 canvases (um de PDF e um de anotação por página); hoje fica na
// casa de uma dezena, independentemente do tamanho.

// Retrato: em paisagem o leitor entra em modo de página dupla e o layout muda,
// o que só tornaria as contagens mais difíceis de ler.
test.use({ viewport: { width: 834, height: 1112 } })

// Semear o IndexedDB, recarregar e rasterizar páginas de verdade não cabe no
// timeout padrão de 30s numa máquina de CI carregada.
test.describe.configure({ timeout: 120000 })

const VIEWER = '[role="document"]'

// Teto de canvases tolerado. A faixa de retenção é de 1500px para cada lado e
// cada página tem ~1080px de altura nesta viewport, o que dá umas 4 páginas
// vivas (~8 canvases). O teto fica bem acima disso para não ficar frágil, e bem
// abaixo do comportamento antigo — que seria 2× o total de páginas.
const MAX_CANVASES = 16

async function seed(page, { scores, playlists = [] }) {
  await page.addInitScript(makePdfSource())
  await page.goto('/')

  await page.evaluate(async ({ scores, playlists }) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('partituras-db', 1)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains('pdfs')) d.createObjectStore('pdfs')
        if (!d.objectStoreNames.contains('recordings')) d.createObjectStore('recordings')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    await new Promise((resolve, reject) => {
      const tx = db.transaction('pdfs', 'readwrite')
      for (const s of scores) tx.objectStore('pdfs').put(window.__makePdf(s.pages), s.id)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })

    localStorage.setItem('sp.landing', '1')
    localStorage.setItem('sp.onboarding', '1')
    localStorage.setItem('sp.fit', 'page')
    localStorage.setItem('sp.scores', JSON.stringify(
      scores.map(s => ({ ...s, type: 'pdf', addedAt: Date.now() }))
    ))
    localStorage.setItem('sp.playlists', JSON.stringify(playlists))
  }, { scores, playlists })

  await page.reload()
}

const countCanvases = (page) => page.locator(`${VIEWER} canvas`).count()

async function openScore(page, name) {
  await page.getByText(name, { exact: true }).first().click()
  await expect(page.locator(VIEWER)).toBeVisible()
  // Espera a primeira página existir de fato, não só o container.
  await expect.poll(() => countCanvases(page), { timeout: 15000 }).toBeGreaterThan(0)
}

// Nesta largura (iPad em retrato) a navegação fica atrás do hambúrguer, então
// chegar à playlist passa por abrir o menu.
async function openPlaylist(page, name) {
  await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
  await page.getByRole('button', { name, exact: true }).click()
  await page.getByRole('button', { name: /^(tocar|play)$/i }).click()
  await expect(page.locator(VIEWER)).toBeVisible()
  await expect.poll(() => countCanvases(page), { timeout: 15000 }).toBeGreaterThan(0)
}

// Rola o leitor de ponta a ponta verificando o teto a cada parada.
//
// A verificação é por polling de propósito: durante a rolagem é normal haver um
// excedente momentâneo, com renders em voo e páginas ainda não recolhidas. O que
// não pode acontecer é a contagem ficar alta — um canvas vazado nunca volta,
// então o poll jamais convergiria e o teste falha, que é o comportamento
// desejado. Fixar um sleep e medir uma vez só tornaria o teste instável.
async function scrollThroughExpectingCap(page, steps) {
  for (let i = 0; i < steps; i++) {
    await page.locator(VIEWER).evaluate((v, n) => { v.scrollTop = (v.scrollHeight - v.clientHeight) * n }, (i + 1) / steps)
    await expect.poll(() => countCanvases(page), { timeout: 10000 })
      .toBeLessThanOrEqual(MAX_CANVASES)
  }
}

test.describe('Reader — uma partitura longa', () => {
  test('abre e renderiza a primeira página', async ({ page }) => {
    await seed(page, { scores: [{ id: 'sc1', name: 'Sonata Longa', pages: 30 }] })
    await openScore(page, 'Sonata Longa')

    // Renderizado de verdade: o canvas tem dimensões reais, não é um placeholder.
    const size = await page.locator(`${VIEWER} canvas`).first().evaluate(c => ({ w: c.width, h: c.height }))
    expect(size.w).toBeGreaterThan(0)
    expect(size.h).toBeGreaterThan(0)
  })

  test('não aloca canvas para a partitura inteira ao abrir', async ({ page }) => {
    await seed(page, { scores: [{ id: 'sc1', name: 'Sonata Longa', pages: 30 }] })
    await openScore(page, 'Sonata Longa')

    // Era exatamente isto que derrubava a aba: 30 páginas viravam 60 canvases
    // em resolução cheia, alocados de uma vez na abertura.
    await expect.poll(() => countCanvases(page), { timeout: 10000 })
      .toBeLessThanOrEqual(MAX_CANVASES)
  })

  test('mantém o número de canvases estável ao rolar a partitura toda', async ({ page }) => {
    await seed(page, { scores: [{ id: 'sc1', name: 'Sonata Longa', pages: 30 }] })
    await openScore(page, 'Sonata Longa')

    // Sem liberação, cada página visitada ficaria para trás e a contagem só
    // subiria ao longo da rolagem.
    await scrollThroughExpectingCap(page, 8)
  })

  test('reconstrói uma página já liberada ao voltar para ela', async ({ page }) => {
    await seed(page, { scores: [{ id: 'sc1', name: 'Sonata Longa', pages: 30 }] })
    await openScore(page, 'Sonata Longa')

    await scrollThroughExpectingCap(page, 6)
    await page.locator(VIEWER).evaluate(v => { v.scrollTop = 0 })
    await page.waitForTimeout(600)

    // Voltar ao topo tem de mostrar a página 1 de novo — liberar não pode virar
    // uma página em branco permanente.
    const first = page.locator(`${VIEWER} canvas`).first()
    await expect(first).toBeVisible()
    expect(await first.evaluate(c => c.width)).toBeGreaterThan(0)
  })
})

test.describe('Reader — playlist', () => {
  const scores = [
    { id: 'sc1', name: 'Peca Um', pages: 10 },
    { id: 'sc2', name: 'Peca Dois', pages: 10 },
    { id: 'sc3', name: 'Peca Tres', pages: 10 },
  ]
  const playlists = [{
    id: 'pl1',
    name: 'Ensaio',
    color: '#E73B4C',
    items: scores.map(s => ({ scoreId: s.id })),
  }]

  test('concatena as peças sem alocar tudo de uma vez', async ({ page }) => {
    await seed(page, { scores, playlists })

    await openPlaylist(page, 'Ensaio')

    // O caminho de playlist era o pior caso: a alocação eager multiplicava por
    // peça, então 3 peças de 10 páginas pediam 60 canvases na abertura.
    await expect.poll(() => countCanvases(page), { timeout: 10000 })
      .toBeLessThanOrEqual(MAX_CANVASES)
  })

  test('abre na peça clicada, não na primeira da playlist', async ({ page }) => {
    await seed(page, { scores, playlists })

    await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
    await page.getByRole('button', { name: 'Ensaio', exact: true }).click()
    // Entra pelo card da segunda peça, não pelo botão Tocar.
    await page.getByText('Peca Dois', { exact: true }).first().click()
    await expect(page.locator(VIEWER)).toBeVisible()
    await expect.poll(() => countCanvases(page), { timeout: 15000 }).toBeGreaterThan(0)

    // A posição tem de cair dentro da faixa da segunda peça. Comparar com os
    // divisores em vez de um pixel fixo mantém o teste independente do
    // tamanho exato da página.
    await expect.poll(async () => page.locator(VIEWER).evaluate(v => {
      const dividers = [...v.querySelectorAll('.piece-divider')]
      const atual = dividers.filter(d => d.offsetTop <= v.scrollTop + 8).pop()
      return atual ? atual.textContent.trim() : null
    }), { timeout: 10000 }).toBe('Peca Dois')
  })

  test('mantém o teto ao rolar por todas as peças', async ({ page }) => {
    await seed(page, { scores, playlists })

    await openPlaylist(page, 'Ensaio')
    await scrollThroughExpectingCap(page, 8)
  })
})

// Uma playlist pode repetir a mesma partitura: fatiar um songbook em músicas
// por faixa de página é o caso real disso. Aí o id da partitura não distingue
// as peças, e identificar o alvo só por ele levava o leitor a abrir na
// ocorrência errada — a última vencia, porque cada match sobrescrevia o alvo.
test.describe('Reader — playlist que repete a mesma partitura', () => {
  const scores = [{ id: 'sb', name: 'Songbook', pages: 30 }]
  const playlists = [{
    id: 'pl1',
    name: 'Repertorio',
    color: '#E73B4C',
    items: [
      { scoreId: 'sb', fromPage: 1, toPage: 10 },
      { scoreId: 'sb', fromPage: 11, toPage: 20 },
      { scoreId: 'sb', fromPage: 21, toPage: 30 },
    ],
  }]

  async function abrirItem(page, nth) {
    await seed(page, { scores, playlists })
    await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
    await page.getByRole('button', { name: 'Repertorio', exact: true }).click()
    await page.getByText('Songbook', { exact: true }).nth(nth).click()
    await expect(page.locator(VIEWER)).toBeVisible()
    await expect.poll(() => countCanvases(page), { timeout: 15000 }).toBeGreaterThan(0)
  }

  // A tolerância cobre o respiro entre o divisor e a página logo abaixo dele:
  // o leitor rola para `wrap.offsetTop - 16`, e no topo da lista o primeiro
  // divisor fica alguns pixels abaixo de zero absoluto.
  const pecaAtual = (page) => page.locator(VIEWER).evaluate(v => {
    const dividers = [...v.querySelectorAll('.piece-divider')]
    const atual = dividers.filter(d => d.offsetTop <= v.scrollTop + 32).pop()
    return atual ? atual.textContent.trim() : null
  })

  test('abre na primeira fatia quando ela é a clicada', async ({ page }) => {
    await abrirItem(page, 0)
    await expect.poll(() => pecaAtual(page), { timeout: 10000 })
      .toBe('Songbook (p. 1–10)')
  })

  test('abre na fatia do meio quando ela é a clicada', async ({ page }) => {
    await abrirItem(page, 1)
    await expect.poll(() => pecaAtual(page), { timeout: 10000 })
      .toBe('Songbook (p. 11–20)')
  })

  test('abre na última fatia quando ela é a clicada', async ({ page }) => {
    await abrirItem(page, 2)
    await expect.poll(() => pecaAtual(page), { timeout: 10000 })
      .toBe('Songbook (p. 21–30)')
  })
})

// A "Métodos" do relato: 9 PDFs grandes, todos distintos, sem faixas de página.
// Montar isso leva segundos, e é aí que o leitor era vulnerável — qualquer
// render do App no meio do caminho cancelava a montagem, e a rolagem para a
// peça clicada só acontecia depois de montar a playlist inteira.
test.describe('Reader — playlist grande', () => {
  // A "Métodos" do relato: vários PDFs grandes, todos distintos, sem faixas de
  // página. A escala importa para o que se mede aqui — com poucas páginas a
  // montagem termina rápido demais e o defeito não aparece.
  const scores = Array.from({ length: 9 }, (_, n) => ({
    id: 'm' + n, name: 'Metodo ' + n, pages: 120,
  }))
  const playlists = [{
    id: 'pl1', name: 'Metodos', color: '#E9B949',
    items: scores.map(s => ({ scoreId: s.id })),
  }]

  const pecaAtual = (page) => page.locator(VIEWER).evaluate(v => {
    const dividers = [...v.querySelectorAll('.piece-divider')]
    const atual = dividers.filter(d => d.offsetTop <= v.scrollTop + 32).pop()
    return atual ? atual.textContent.trim() : null
  })

  async function abrir(page, nome) {
    await seed(page, { scores, playlists })
    await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
    await page.getByRole('button', { name: 'Metodos', exact: true }).click()
    await page.getByText(nome, { exact: true }).first().click()
    await expect(page.locator(VIEWER)).toBeVisible()
  }

  // Antes desta correção a rolagem só acontecia depois de montar a playlist
  // inteira, e a montagem era cancelada por qualquer render do App no meio do
  // caminho. Nesta escala o resultado medido era "nunca chega": o leitor ficava
  // parado na primeira peça indefinidamente.
  test('chega na peça clicada apesar da montagem demorada', async ({ page }) => {
    await abrir(page, 'Metodo 3')
    await expect.poll(() => pecaAtual(page), { timeout: 30000 }).toBe('Metodo 3')
  })

  test('não perde o alvo se o App renderizar durante a montagem', async ({ page }) => {
    await abrir(page, 'Metodo 4')

    // O registro de tempo de estudo provoca renders do App sozinho. Aqui a
    // mesma pressão é aplicada de fora, durante a janela de montagem.
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.dispatchEvent(new Event('resize')))
      await page.waitForTimeout(120)
    }

    await expect.poll(() => pecaAtual(page), { timeout: 30000 }).toBe('Metodo 4')
  })
})

// O cache de documentos do pdf.js tem teto de 6. Numa playlist com mais peças
// que isso, as já montadas ficam pinadas e o único candidato a descarte passa a
// ser o documento recém-carregado — que era destruído e devolvido morto, e o
// getPage seguinte estourava. A montagem morria a partir dessa peça, então
// clicar numa das últimas caía na primeira.
//
// Aqui os arquivos são leves de propósito: o que se exercita é a QUANTIDADE de
// documentos, não o tamanho de cada um.
test.describe('Reader — playlist com mais peças que o cache', () => {
  const scores = Array.from({ length: 9 }, (_, n) => ({
    id: 'c' + n, name: 'Curta ' + n, pages: 4,
  }))
  const playlists = [{
    id: 'pl1', name: 'Nove', color: '#3B82F6',
    items: scores.map(s => ({ scoreId: s.id })),
  }]

  const pecaAtual = (page) => page.locator(VIEWER).evaluate(v => {
    const dividers = [...v.querySelectorAll('.piece-divider')]
    const atual = dividers.filter(d => d.offsetTop <= v.scrollTop + 32).pop()
    return atual ? atual.textContent.trim() : null
  })

  for (const alvo of ['Curta 6', 'Curta 8']) {
    test(`abre em "${alvo}", além do teto do cache`, async ({ page }) => {
      await seed(page, { scores, playlists })
      await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
      await page.getByRole('button', { name: 'Nove', exact: true }).click()
      await page.getByText(alvo, { exact: true }).first().click()
      await expect(page.locator(VIEWER)).toBeVisible()
      await expect.poll(() => pecaAtual(page), { timeout: 30000 }).toBe(alvo)
    })
  }
})
