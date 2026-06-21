import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from './i18n'
import { UIProvider, useToast, useConfirm } from './ui'

function wrap(ui) {
  return render(<I18nProvider><UIProvider>{ui}</UIProvider></I18nProvider>)
}

describe('UIProvider — toasts', () => {
  it('shows a toast and dismisses it on click', async () => {
    function Demo() {
      const toast = useToast()
      return <button onClick={() => toast('Salvo!', { type: 'success' })}>go</button>
    }
    wrap(<Demo />)
    fireEvent.click(screen.getByText('go'))
    const toast = await screen.findByText('Salvo!')
    expect(toast).toBeTruthy()
    fireEvent.click(toast)
    await waitFor(() => expect(screen.queryByText('Salvo!')).toBeNull())
  })
})

describe('UIProvider — confirm', () => {
  it('resolves true when confirmed and false when cancelled', async () => {
    let confirmFn
    function Demo() {
      confirmFn = useConfirm()
      return null
    }
    wrap(<Demo />)

    let p
    act(() => { p = confirmFn({ title: 'Excluir?', confirmLabel: 'Excluir' }) })
    fireEvent.click(await screen.findByText('Excluir'))
    await expect(p).resolves.toBe(true)

    act(() => { p = confirmFn({ title: 'De novo?' }) })
    fireEvent.click(await screen.findByText('Cancelar'))
    await expect(p).resolves.toBe(false)
  })
})
