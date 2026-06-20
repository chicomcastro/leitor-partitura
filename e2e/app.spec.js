import { test, expect } from '@playwright/test'

test.describe('Library', () => {
  test('shows onboarding on first visit', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('button', { name: /próximo|next/i })).toBeVisible()
  })

  test('can dismiss onboarding', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('shows empty state after dismissing onboarding', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    await expect(page.getByText(/estante está vazia|music stand is empty/i)).toBeVisible()
  })

  test('has import button', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    const importBtn = page.getByRole('button', { name: /importar|import/i })
    await expect(importBtn.first()).toBeVisible()
  })

  test('has playlist creation button', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    const btn = page.getByRole('button', { name: /nova playlist|new playlist/i })
    await expect(btn).toBeVisible()
  })

  test('has tabs with score count', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    const tab = page.getByRole('tab', { selected: true })
    await expect(tab).toBeVisible()
  })

  test('has search input', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    const search = page.getByPlaceholder(/buscar|search/i)
    await expect(search).toBeVisible()
  })

  test('has language toggle', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('dialog').getByText(/pular|skip/i).click()
    const langBtn = page.getByRole('button', { name: /idioma|language/i })
    await expect(langBtn).toBeVisible()
  })
})

test.describe('Onboarding flow', () => {
  test('navigates through all steps', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /próximo|next/i }).click()
    await dialog.getByRole('button', { name: /próximo|next/i }).click()

    const importBtn = dialog.getByRole('button', { name: /importar partitura|import sheet/i })
    await expect(importBtn).toBeVisible()
  })

  test('can go back in steps', async ({ page }) => {
    await page.goto('/')
    const dialog = page.getByRole('dialog')

    await dialog.getByRole('button', { name: /próximo|next/i }).click()
    await dialog.getByRole('button', { name: /voltar|back/i }).click()

    const nextBtn = dialog.getByRole('button', { name: /próximo|next/i })
    await expect(nextBtn).toBeVisible()
  })
})
