# ChatHel · sito per i direttori (chathel.it)

Pagina di presentazione di ChatHel per i direttori di hotel e resort. È separata dall'app degli ospiti (chathel.com, repository `chathel-claude`).

## Com'è fatto
- Sito statico: `index.html`, `style.css`, `main.js` e la cartella `img/`. Nessuna dipendenza, nessuna compilazione.
- Colori: i token dell'app (`chathel-claude/src/app/globals.css`, design v2). **Non si cambiano.**
- Caratteri: Montserrat per i titoli, Inter per il testo (Google Fonts).
- Le schermate in `img/*.webp` sono catture reali dell'app in modalità demo (`CHATHEL_DEMO=1`), con ospiti dimostrativi.

## Aprirlo in locale
Basta un doppio clic su `index.html`. Oppure, per provarlo come sarà online:

```bash
npx serve .
```

## Pubblicarlo su Vercel
1. Vercel → Add New → Project → importare il repository `chathel-sito`.
2. Framework Preset: **Other**. Build Command e Output Directory vuoti (la radice è il sito).
3. Dopo il primo deploy: Settings → Domains → aggiungere `chathel.it` e `www.chathel.it`.

## Testi: cosa non scrivere
Regole del marchio (BRAND.md, sezione Claims): niente "conforme al GDPR", "certificato", "sicuro al 100%"; niente percentuali di risparmio o ricavo prima dei dati del pilota; niente frasi da app di incontri; niente nomi di hotel come clienti senza accordo scritto. Prima della costituzione della SRL si scrive solo "ChatHel".

La reception AI è segnata "in attivazione" finché non è attiva in produzione: togliere l'etichetta in `index.html` quando lo sarà.
