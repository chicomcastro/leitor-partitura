import { test, expect } from '@playwright/test'

async function skipLanding(page) {
  await page.goto('/')
  const cta = page.getByRole('button', { name: /abrir o app|open the app/i }).first()
  if (await cta.isVisible().catch(() => false)) {
    await cta.click()
    await page.waitForSelector('[role="main"], [role="tablist"]', { timeout: 5000 })
  }
}

test.describe('Landing', () => {
  test('shows landing page on first visit', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/estante de partituras|digital music stand/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /abrir o app|open the app/i }).first()).toBeVisible()
  })

  test('shows feature cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/metrônomo|metronome/i).first()).toBeVisible()
  })

  test('CTA enters the Library', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /abrir o app|open the app/i }).first().click()
    await expect(page.getByText(/estante está vazia|music stand is empty/i)).toBeVisible()
  })
})

test.describe('Library', () => {
  test('shows empty state', async ({ page }) => {
    await skipLanding(page)
    await expect(page.getByText(/estante está vazia|music stand is empty/i)).toBeVisible()
  })

  test('has import button', async ({ page }) => {
    await skipLanding(page)
    const importBtn = page.getByRole('button', { name: /importar|import/i })
    await expect(importBtn.first()).toBeVisible()
  })

  test('has playlist creation button', async ({ page }) => {
    await skipLanding(page)
    const btn = page.getByRole('button', { name: /nova playlist|new playlist/i })
    await expect(btn.first()).toBeVisible()
  })

  test('has sidebar navigation', async ({ page }) => {
    await skipLanding(page)
    await expect(page.getByRole('button', { name: /todas as partituras|all scores/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /favoritas|favorites/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /recentes|recent/i })).toBeVisible()
  })

  test('has search input', async ({ page }) => {
    await skipLanding(page)
    const search = page.getByPlaceholder(/buscar|search/i)
    await expect(search).toBeVisible()
  })

  test('has language toggle', async ({ page }) => {
    await skipLanding(page)
    // The language toggle lives inside the overflow menu, so open it first.
    await page.getByRole('button', { name: 'Menu' }).click()
    const langBtn = page.getByRole('button', { name: /idioma|language/i })
    await expect(langBtn).toBeVisible()
  })
})
