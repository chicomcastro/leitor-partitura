import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import s from './Onboarding.module.css'

const STEP_ICONS = [
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" />
  </svg>,
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8,9.28V14.72L12.22,12L8,9.28M13.67,6L15.57,4.09C15.96,3.7 16.11,3.12 15.87,2.63C15.71,2.28 15.46,2 15,2H9C8.54,2 8.29,2.28 8.13,2.63C7.89,3.12 8.04,3.7 8.43,4.09L10.33,6H3A1,1 0 0,0 2,7V19A1,1 0 0,0 3,20H21A1,1 0 0,0 22,19V7A1,1 0 0,0 21,6H13.67Z" />
  </svg>,
  <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" />
  </svg>,
]

const STEP_KEYS = [
  { title: 'onboarding.step1Title', text: 'onboarding.step1Text' },
  { title: 'onboarding.step2Title', text: 'onboarding.step2Text' },
  { title: 'onboarding.step3Title', text: 'onboarding.step3Text' },
]

export default function Onboarding({ onDismiss, onImport }) {
  const { t } = useI18n()
  const [step, setStep] = useState(0)
  const isLast = step === STEP_KEYS.length - 1

  return (
    <div className={s.backdrop}>
      <div className={s.card} role="dialog" aria-modal="true" aria-label={t('onboarding.welcome')}>
        <button className={s.skip} onClick={onDismiss}>{t('onboarding.skip')}</button>
        <div className={s.iconWrap} aria-hidden="true">{STEP_ICONS[step]}</div>
        <div className={s.title} aria-live="polite">{t(STEP_KEYS[step].title)}</div>
        <div className={s.text}>{t(STEP_KEYS[step].text)}</div>
        <div className={s.dots} aria-hidden="true">
          {STEP_KEYS.map((_, i) => (
            <div key={i} className={`${s.dot} ${i === step ? s.dotActive : ''}`} />
          ))}
        </div>
        <div className={s.actions}>
          {step > 0 && (
            <button className={s.btnBack} onClick={() => setStep(step - 1)}>{t('onboarding.back')}</button>
          )}
          {isLast ? (
            <button className={s.btnPrimary} onClick={onImport}>{t('onboarding.import')}</button>
          ) : (
            <button className={s.btnPrimary} onClick={() => setStep(step + 1)}>{t('onboarding.next')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
