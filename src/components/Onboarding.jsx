import { useState } from 'react'
import s from './Onboarding.module.css'

const STEPS = [
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" />
      </svg>
    ),
    title: 'Importe suas partituras',
    text: 'Adicione PDFs ou imagens das suas partituras. Eles ficam salvos neste dispositivo.',
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8,9.28V14.72L12.22,12L8,9.28M13.67,6L15.57,4.09C15.96,3.7 16.11,3.12 15.87,2.63C15.71,2.28 15.46,2 15,2H9C8.54,2 8.29,2.28 8.13,2.63C7.89,3.12 8.04,3.7 8.43,4.09L10.33,6H3A1,1 0 0,0 2,7V19A1,1 0 0,0 3,20H21A1,1 0 0,0 22,19V7A1,1 0 0,0 21,6H13.67Z" />
      </svg>
    ),
    title: 'Configure os gestos',
    text: 'Defina toques e swipes para virar páginas do jeito que preferir — ideal para tablet na estante.',
  },
  {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" />
      </svg>
    ),
    title: 'Pronto para o ensaio',
    text: 'Metrônomo, marcadores, anotações e gravação — tudo o que você precisa na ponta dos dedos.',
  },
]

export default function Onboarding({ onDismiss, onImport }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1

  return (
    <div className={s.backdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-label="Boas-vindas ao Leitor de Partituras">
        <button className={s.skip} onClick={onDismiss}>Pular</button>
        <div className={s.iconWrap} aria-hidden="true">{STEPS[step].icon}</div>
        <div className={s.title} aria-live="polite">{STEPS[step].title}</div>
        <div className={s.text}>{STEPS[step].text}</div>
        <div className={s.dots} aria-hidden="true">
          {STEPS.map((_, i) => (
            <div key={i} className={`${s.dot} ${i === step ? s.dotActive : ''}`} />
          ))}
        </div>
        <div className={s.actions}>
          {step > 0 && (
            <button className={s.btnBack} onClick={() => setStep(step - 1)}>Voltar</button>
          )}
          {isLast ? (
            <button className={s.btnPrimary} onClick={onImport}>Importar partitura</button>
          ) : (
            <button className={s.btnPrimary} onClick={() => setStep(step + 1)}>Próximo</button>
          )}
        </div>
      </div>
    </div>
  )
}
