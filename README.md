# ChatHel · sito per i direttori (chathel.com)

Pagina di presentazione di ChatHel per i direttori di hotel e resort. È separata dall'app degli ospiti e dal pannello degli hotel (chathel.it, repository `chathel-claude`). I domini sono stati invertiti il 10/11/2026: i biglietti da visita riportano chathel.com.

## Com'è fatto
- Sito statico: `index.html`, `style.css`, `main.js` e la cartella `img/`. Nessuna dipendenza, nessuna compilazione.
- Colori: i token dell'app (`chathel-claude/src/app/globals.css`, design v2). **Non si cambiano.**
- Caratteri: Montserrat per i titoli, Inter per il testo (Google Fonts).
- Le schermate in `img/*.webp` sono catture reali dell'app in modalità demo (`CHATHEL_DEMO=1`), con ospiti dimostrativi.

## Aprirlo in locale
I percorsi di immagini e stili partono da `/` (servono per i link `/v/…`), quindi il doppio clic su `index.html` non basta: avviare un piccolo server nella cartella.

```bash
npx serve .
```

## Pubblicarlo su Vercel
1. Vercel → Add New → Project → importare il repository `chathel-sito`.
2. Framework Preset: **Other**. Build Command e Output Directory vuoti (la radice è il sito).
3. Settings → Domains: `chathel.com` e `www.chathel.com` (già collegati). `chathel.it` appartiene al progetto dell'app (`chathel-app`): non aggiungerlo qui.

## Testi: cosa non scrivere
Regole del marchio (BRAND.md, sezione Claims): niente "conforme al GDPR", "certificato", "sicuro al 100%"; niente percentuali di risparmio o ricavo prima dei dati del pilota; niente frasi da app di incontri; niente nomi di hotel come clienti senza accordo scritto. Prima della costituzione della SRL si scrive solo "ChatHel".

La reception AI è segnata "in attivazione" finché non è attiva in produzione: togliere l'etichetta in `index.html` quando lo sarà.

## Statistiche delle visite
Web Analytics di Vercel è attivo dal 20/11/2026 (progetto `chathel-sito` → Analytics). Non usa cookie; le visite precedenti non sono registrate.

### Link personale per un hotel
```
https://chathel.com/v/nome-hotel
```
Apre lo stesso sito; nel pannello di Vercel (Analytics → Pages) la visita compare come pagina `/v/nome-hotel`, con data, paese e dispositivo. Usare solo lettere minuscole, numeri e trattini (`hotel-mare`, `h07`). La regola è in `vercel.json` (rewrites).

Non usare i parametri `utm_`: sul piano gratuito Vercel non li mostra (servono Enterprise o il componente Web Analytics Plus).

Il link lega una visita a un hotel, quindi a una persona: va citato nell'informativa del sito, da far verificare all'avvocato.

## Pannello delle visite (con la città)
**chathel.com/pannello-visite**, protetto da password, non indicizzato. Mostra ogni visita con data e ora italiana, pagina (home o `/v/<hotel>`), città, regione e paese, dispositivo, browser, provenienza e un codice anonimo del visitatore; più i totali per hotel e per città. Il tasto "Non contare questo browser" esclude le visite dei soci.

Come funziona:
- `main.js` manda a `POST /api/visit` solo la pagina e il sito di provenienza (niente cookie; niente invio dai browser automatici o da quelli segnati "non contare").
- `api/visit.js` scarta i robot noti, prende città/regione/paese dalle intestazioni di Vercel (`x-vercel-ip-city` ecc.) e salva una riga in Supabase (`public.site_visits`). **L'IP non si salva**: serve solo per il codice anonimo del visitatore (`sha256(VISITS_SALT|giorno|IP|browser)`, cambia ogni giorno).
- `api/visits.js` restituisce le visite al pannello se la password è giusta (confronto a tempo costante, 0,8 s di attesa sugli errori).
- Logica in `lib/visits.js`, test in `test/` (`npm test`).

Da fare una volta sola (Lorenzo):
1. Supabase → SQL Editor → eseguire `sql/site_visits.sql`.
2. Vercel → progetto `chathel-sito` → Settings → Environment Variables (Production), **mai in chat**:
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: gli stessi valori del progetto `chathel-app`;
   - `VISITS_PANEL_PASSWORD`: la password del pannello, scelta da voi (lunga);
   - `VISITS_SALT`: una parola segreta lunga e a caso, da non cambiare (cambiandola, i codici dei visitatori ripartono).
3. Ripubblicare (Deployments → … → Redeploy) perché le variabili valgano.

Conservazione: le visite restano nella tabella; cancellare quelle più vecchie di 13 mesi (`delete from public.site_visits where ts < now() - interval '13 months';`). La città è approssimativa e dedotta dall'indirizzo internet: è comunque un dato personale, da citare nell'informativa del sito insieme ai link per hotel (da far verificare all'avvocato).
