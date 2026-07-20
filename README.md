# A un passo dal sogno — sito

Sito one-page statico costruito con [Hugo](https://gohugo.io/). Nessun
database, nessun tracker, nessun cookie banner: solo file di testo che
generano pagine HTML velocissime.

## Come vedere il sito in anteprima

1. Installa Hugo (versione "extended"): https://gohugo.io/installation/
2. Da questa cartella lancia:
   ```
   hugo server
   ```
3. Apri http://localhost:1313 nel browser. La pagina si aggiorna da sola
   ogni volta che salvi una modifica a un file.

Per generare i file definitivi da pubblicare (cartella `public/`):
```
hugo --gc --minify
```

## Come modificare i contenuti (guida rapida, nessuna competenza tecnica richiesta)

Ci sono solo due tipi di file da toccare: **testi** (Markdown, dentro
`content/`) e **liste/numeri** (YAML, dentro `data/`). Non serve mai
toccare la cartella `layouts/` (quella è "il motore" del sito).

Regole generali per non rompere nulla:
- Ogni file YAML (`data/*.yaml`) usa il carattere `:` per separare nome e
  valore. Mantieni gli spazi e i due punti come negli esempi esistenti;
  se non sei sicuro, copia una riga esistente e modifica solo il testo.
  Metti tra virgolette `"..."` i testi che contengono `:`, `#` o accenti
  particolari, per sicurezza.
- I file Markdown (`content/`) hanno un blocco in cima tra due righe
  `---` (il "front matter"): lì dentro non cambiare i nomi dei campi
  (`eyebrow`, `titolo`, `ordine`, `attivo`...), cambia solo il testo dopo
  i due punti. Sotto il secondo `---` c'è il paragrafo libero, quello lo
  puoi riscrivere come vuoi.
- Dopo ogni modifica, se hai `hugo server` aperto, controlla subito
  l'anteprima nel browser.

### Nascondere/mostrare una sezione o riordinarla

Apri il file della sezione in `content/sezioni/` (es. `orari.md`) e
cambia:
```yaml
attivo: true      # metti "false" per nascondere tutta la sezione
ordine: 3         # numero più basso = più in alto nella pagina
```
Il menu in alto si aggiorna automaticamente da solo (se nascondi una
sezione, sparisce anche la sua voce di menu).

### Aggiungere/modificare/nascondere un corso

File: `data/corsi.yaml` (corsi "normali") oppure `data/danzatricita.yaml`
(corsi di DanzatricitÃ ). Copia un blocco esistente (le righe che iniziano
con `- nome:`) e modifica i valori. Per nascondere un corso senza
cancellarlo, metti `visibile: false`.

### Modificare gli orari

File: `data/orari.yaml`. Per aggiungere una lezione, copia una riga sotto
`lezioni:` e cambia nome/orario. Per nascondere TUTTA la sezione Orari
(es. in estate) usa `attivo: false` in `content/sezioni/orari.md` — non
serve toccare `data/orari.yaml`.

### Modificare i numeri di "Chi siamo"

File: `data/contatori.yaml`. Tre numeri semplici, aggiornali a mano
quando serve (non si calcolano da soli).

### Aggiungere/modificare una recensione

File: `data/recensioni.yaml`. Stesso schema degli altri elenchi: copia un
blocco, cambia nome/ruolo/testo, `visibile: false` per nasconderla senza
cancellarla.

### Contatti reali (telefono, email, WhatsApp, indirizzo, mappa, social)

File: `data/contatti.yaml`. **Contiene ancora dati segnaposto** — vanno
sostituiti con quelli reali della scuola prima di andare online:
- `telefono`, `email`: testo libero.
- `whatsapp.numero`: solo cifre con prefisso internazionale, senza `+` né
  spazi (es. numero italiano `+39 333 1234567` diventa `393331234567`).
- `social.instagram` / `social.facebook`: incolla il link completo. Se
  lasci il campo vuoto (`""`), il link sparisce da solo dalla pagina.
- `indirizzo`: testo libero, compare vicino alla mappa.
- `mappa_embed_src`: se cambia solo l'indirizzo, basta modificare il
  testo dopo `q=` nell'URL esistente (spazi sostituiti da `+`). In
  alternativa, su Google Maps: cerca l'indirizzo → “Condividi” →
  “Incorpora una mappa” → copia il link dentro `src="..."` e incollalo
  qui al posto di quello esistente.

La mappa si carica solo quando un visitatore clicca sulla card (scelta
voluta, per non contattare i server di Google ad ogni visita).

### Testi introduttivi di ogni sezione (eyebrow, titolo, paragrafo)

File: `content/sezioni/*.md`. `eyebrow` è l'etichetta piccola sopra il
titolo, `titolo` è il titolo grande, il testo sotto il secondo `---` è il
paragrafo descrittivo.

### Testo e bottoni della prima schermata (hero)

File: `content/_index.md`. `hero_titolo` e `hero_sottotitolo` sono i due
testi grandi; `hero_cta_primaria`/`hero_cta_secondaria` sono i due
bottoni (ognuno ha un testo e un link — `tipo: "ancora"` se punta a una
sezione della stessa pagina come `#corsi`, `tipo: "esterno"` se punta a
un sito/numero esterno come WhatsApp).

### Logo e favicon

Sono ancora un segnaposto generato automaticamente (un semplice cerchio
colorato). Quando la scuola fornirà il logo definitivo (immagine raster),
basta sostituire questi file in `static/img/` **mantenendo lo stesso
nome**, senza toccare nessun template:
- `logo-mark.png` (usato accanto al nome nel menu, quadrato, sfondo
  trasparente consigliato)
- `favicon-32x32.png`, `favicon-16x16.png` (icona nella scheda del
  browser)
- `apple-touch-icon.png` (180×180px, icona su iPhone/iPad, sfondo pieno
  consigliato, non trasparente)

Lo script `scripts/genera_placeholder.py` (richiede solo Python, nessuna
libreria esterna) rigenera questi segnaposto se mai servisse ripartire da
zero — non serve rilanciarlo quando arriva il logo reale.

## Cose lasciate volutamente in sospeso

- **Contatti reali**: vedi sopra, `data/contatti.yaml` ha ancora
  segnaposto.
- **Hosting**: non ancora deciso. Influisce su `baseURL` in `hugo.toml`
  (da aggiornare con il dominio reale) e su come collegare eventualmente
  un CMS per l'editing (vedi punto sotto).
- **CMS per editing da browser (Decap CMS)**: valutato per Codeberg, ma
  non ancora collegato — l'editing oggi avviene modificando i file
  direttamente (via Git/Codeberg web editor o altro). Non è indispensabile
  per iniziare: la struttura dati è già pensata per essere compatibile.
- **Font**: il CSS usa i font serif già installati sul dispositivo
  dell'utente (nessuna richiesta a Google Fonts, per restare senza
  terze parti). Se in futuro si vuole il font "Cormorant Garamond"
  identico al design originale, andrebbe auto-ospitato in `assets/fonts/`.
- **Sezioni opzionali** (Insegnanti, Galleria foto, FAQ): non incluse,
  da valutare in seguito.
