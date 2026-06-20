# 🎵 Estante

### Sua estante de partituras digital — gratuita, offline e direto no tablet.

Uma alternativa web e gratuita a apps como forScore e MobileSheets. Sem cadastro, sem assinatura. Suas partituras ficam salvas no seu dispositivo.

### 👉 [Abrir o app](https://chicomcastro.github.io/leitor-partitura/)

---

## Por que usar?

Músicos em ensaio e palco precisam de algo simples: abrir a partitura e tocar. Sem distrações, sem fricção. O Estante foi feito pra isso.

- Funciona no **tablet, celular ou computador** — basta abrir no navegador
- **Instala como app** na tela inicial — funciona offline
- **Zero cadastro** — importou, tá pronto

## O que faz

📄 **Importar partituras** — PDF ou imagens (JPG, PNG) das suas partituras escaneadas

👆 **Virar páginas por toque** — Configure zonas de toque e swipes do jeito que preferir. Ideal pra tablet na estante

📖 **Duas páginas lado a lado** — Modo paisagem mostra duas páginas automaticamente, como um livro aberto

🎯 **Marcadores** — Salve pontos importantes e pule direto pra eles

📝 **Anotações** — Desenhe sobre a partitura com cores diferentes e borracha

🎵 **Metrônomo integrado** — Com tap tempo, compasso e acento

🎤 **Gravação de áudio** — Grave o ensaio direto no app

📋 **Playlists** — Monte setlists e reorganize por arrastar

⬇️ **Rolagem automática** — Velocidade ajustável pra leitura contínua

🎹 **Pedal Bluetooth** — PageUp/PageDown e setas do teclado funcionam como virada de página

💾 **Backup completo** — Exporte e importe tudo num arquivo `.estante`

🌐 **Português e inglês**

## Como usar

1. Abra o app no navegador do seu tablet
2. Importe um PDF ou imagem da sua partitura
3. Toque na partitura pra abrir o leitor
4. Configure gestos e metrônomo conforme sua preferência

Pronto. Bom ensaio! 🎶

---

<details>
<summary>Para desenvolvedores</summary>

### Setup local

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173/leitor-partitura/`

### Scripts

```bash
npm run build      # Build de produção
npm run preview    # Preview do build
npm run test:e2e   # Testes E2E (Playwright)
```

### Tech stack

React 19, Vite, pdf.js, CSS Modules, PWA com Workbox. Deploy automático via GitHub Actions para GitHub Pages. CI com Playwright e Lighthouse.

### Arquitetura

```
src/
  screens/      Library (grid de partituras) e Reader (visualizador)
  components/   Modal, MetronomePanel, GesturesPanel, Onboarding...
  hooks/        usePersistedState, useMetronome, useRecorder, useAnnotations
  lib/          db (IndexedDB), pdf, backup, i18n
  styles/       Design tokens e estilos globais
docs/adr/       Registros de decisões arquiteturais
```

</details>

## Licença

MIT
