import { useI18n } from '../lib/i18n'
import BrandMark from '../components/BrandMark'
import s from './Landing.module.css'

const FEATURES = [
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2M11,15V12H9V15H6V17H9V20H11V17H14V15H11Z" /></svg>,
    titleKey: 'landing.feat1Title',
    textKey: 'landing.feat1Text',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M10,9A1,1 0 0,1 11,8A1,1 0 0,1 12,9V13.47L13.21,13.6L18.15,15.79C18.68,16.03 19,16.56 19,17.14V21.5C18.97,22.32 18.32,22.97 17.5,23H11C10.62,23 10.26,22.85 10,22.57L5.1,18.37L5.84,17.6C6.03,17.39 6.3,17.28 6.58,17.28H6.8L10,19V9M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2Z" /></svg>,
    titleKey: 'landing.feat2Title',
    textKey: 'landing.feat2Text',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" /></svg>,
    titleKey: 'landing.feat3Title',
    textKey: 'landing.feat3Text',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z" /></svg>,
    titleKey: 'landing.feat4Title',
    textKey: 'landing.feat4Text',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>,
    titleKey: 'landing.feat5Title',
    textKey: 'landing.feat5Text',
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H19V21H12V23H18A3,3 0 0,0 21,20V10C21,5 16.97,1 12,1Z" /></svg>,
    titleKey: 'landing.feat6Title',
    textKey: 'landing.feat6Text',
  },
]

export default function Landing({ onEnter }) {
  const { t } = useI18n()

  return (
    <div className={s.root}>
      <div className={s.hero}>
        <div className={s.heroContent}>
          <div className={s.logoMark}>
            <BrandMark size={40} />
          </div>
          <h1 className={s.title}>{t('landing.title')}</h1>
          <p className={s.subtitle}>{t('landing.subtitle')}</p>
          <button className={s.cta} onClick={onEnter}>{t('landing.cta')}</button>
          <p className={s.ctaHint}>{t('landing.ctaHint')}</p>
        </div>
      </div>

      <div className={s.features}>
        <h2 className={s.sectionTitle}>{t('landing.featuresTitle')}</h2>
        <div className={s.grid}>
          {FEATURES.map((f, i) => (
            <div key={i} className={s.card}>
              <div className={s.cardIcon}>{f.icon}</div>
              <h3 className={s.cardTitle}>{t(f.titleKey)}</h3>
              <p className={s.cardText}>{t(f.textKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={s.bottom}>
        <div className={s.bottomContent}>
          <h2 className={s.bottomTitle}>{t('landing.bottomTitle')}</h2>
          <p className={s.bottomText}>{t('landing.bottomText')}</p>
          <button className={s.cta} onClick={onEnter}>{t('landing.cta')}</button>
        </div>
      </div>

      <footer className={s.footer}>
        <span>{t('landing.footer')}</span>
        <a href="https://github.com/chicomcastro/leitor-partitura" target="_blank" rel="noopener noreferrer" className={s.footerLink}>GitHub</a>
      </footer>
    </div>
  )
}
