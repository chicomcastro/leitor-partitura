import { test, expect } from '@playwright/test'

// iPad em paisagem: acima do breakpoint de 860px, onde o problema aparecia.
test.use({ viewport: { width: 1194, height: 834 } })

// Num aparelho de toque, uma regra :hover que REVELA conteúdo faz o Safari do
// iOS gastar o primeiro toque aplicando o hover em vez de disparar o clique: o
// item acende e nada acontece, e só o segundo toque navega. A defesa é não ter
// revelação por hover onde não há hover.
//
// Limite honesto deste teste: ele não reproduz o comportamento de dois toques
// do Safari — isso o Chromium não faz. O que ele garante é a condição que o
// causava: que sob `hover: none` nada dependa de hover para ficar acessível.
async function emulateTouchDevice(page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'hover', value: 'none' },
      { name: 'any-hover', value: 'none' },
      { name: 'pointer', value: 'coarse' },
    ],
  })
}

async function seedPlaylist(page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('sp.landing', '1')
    localStorage.setItem('sp.onboarding', '1')
    localStorage.setItem('sp.scores', JSON.stringify(
      [{ id: 'sc1', name: 'Alpha', pages: 1, type: 'pdf', addedAt: Date.now() }]
    ))
    localStorage.setItem('sp.playlists', JSON.stringify(
      [{ id: 'pl1', name: 'Ensaio', color: '#E73B4C', items: [{ scoreId: 'sc1' }] }]
    ))
  })
  await page.reload()
}

test.describe('Navegação em aparelho de toque', () => {
  test.use({ hasTouch: true })

  test('o botão de editar playlist não depende de hover para aparecer', async ({ page }) => {
    await emulateTouchDevice(page)
    await seedPlaylist(page)

    // Sem nenhum hover nem toque prévio na linha.
    await expect(page.getByRole('button', { name: /editar playlist|edit playlist/i }))
      .toBeVisible()
  })

  test('um único toque entra na playlist', async ({ page }) => {
    await emulateTouchDevice(page)
    await seedPlaylist(page)

    await page.getByRole('button', { name: 'Ensaio', exact: true }).tap()
    await expect(page.getByRole('heading', { name: 'Ensaio' })).toBeVisible()
  })

})

test.describe('Navegação com ponteiro fino', () => {
  test.use({ hasTouch: false })

  test('o botão segue escondido até o hover', async ({ page }) => {
    // O contraponto: a limpeza da barra lateral no desktop não pode se perder.
    await seedPlaylist(page)
    const editar = page.getByRole('button', { name: /editar playlist|edit playlist/i })
    await expect(editar).toBeHidden()

    await page.getByRole('button', { name: 'Ensaio', exact: true }).hover()
    await expect(editar).toBeVisible()
  })
})
