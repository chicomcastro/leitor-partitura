import { test, expect } from '@playwright/test'
import { makePdfSource } from './fixtures/makePdf.js'

test.use({ viewport: { width: 834, height: 1112 } })
test.describe.configure({ timeout: 120000 })

const MAIN = 'main[role="main"]'

async function seedMuitasPartituras(page, n) {
  await page.addInitScript(makePdfSource())
  await page.goto('/')
  await page.evaluate(async (n) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('partituras-db', 1)
      r.onupgradeneeded = () => {
        const d = r.result
        if (!d.objectStoreNames.contains('pdfs')) d.createObjectStore('pdfs')
        if (!d.objectStoreNames.contains('recordings')) d.createObjectStore('recordings')
      }
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const ids = Array.from({ length: n }, (_, i) => 's' + i)
    await new Promise((res, rej) => {
      const tx = db.transaction('pdfs', 'readwrite')
      for (const id of ids) tx.objectStore('pdfs').put(window.__makePdf(3), id)
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    localStorage.setItem('sp.landing', '1')
    localStorage.setItem('sp.onboarding', '1')
    localStorage.setItem('sp.scores', JSON.stringify(
      ids.map((id, i) => ({ id, name: 'Partitura ' + i, pages: 3, type: 'pdf', addedAt: Date.now() - i }))
    ))
  }, n)
  await page.reload()
}

const scrollTop = (page) => page.locator(MAIN).evaluate(el => el.scrollTop)

test.describe('Library — posição de rolagem', () => {
  // Numa estante longa, voltar do leitor jogava o músico de volta ao topo e ele
  // tinha de reencontrar onde estava.
  test('volta do leitor para a mesma posição da estante', async ({ page }) => {
    await seedMuitasPartituras(page, 30)

    await page.locator(MAIN).evaluate(el => { el.scrollTop = el.scrollHeight - el.clientHeight })
    await page.waitForTimeout(400)
    const antes = await scrollTop(page)
    expect(antes).toBeGreaterThan(0)

    // Abre uma partitura visível nessa altura e volta.
    await page.getByText('Partitura 27', { exact: true }).click()
    await expect(page.locator('[role="document"]')).toBeVisible()
    await page.getByRole('button', { name: /voltar|back/i }).first().click()
    await expect(page.locator(MAIN)).toBeVisible()

    await expect.poll(() => scrollTop(page), { timeout: 10000 })
      .toBeGreaterThan(antes - 80)
  })

  test('trocar de seção começa do topo', async ({ page }) => {
    await seedMuitasPartituras(page, 30)

    await page.locator(MAIN).evaluate(el => { el.scrollTop = 600 })
    await page.waitForTimeout(400)

    // Outra listagem é outro conteúdo: a rolagem anterior não diz nada sobre
    // ela, então a vista abre no topo.
    await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
    await page.getByRole('button', { name: /recentes|recent/i }).click()
    await expect.poll(() => scrollTop(page), { timeout: 10000 }).toBe(0)

    // E voltar para "todas" também começa do topo — a memória é só para a
    // ida e volta ao leitor.
    await page.getByRole('button', { name: /abrir navegação|open navigation/i }).click()
    await page.getByRole('button', { name: /todas as partituras|all scores/i }).click()
    await expect.poll(() => scrollTop(page), { timeout: 10000 }).toBe(0)
  })
})
