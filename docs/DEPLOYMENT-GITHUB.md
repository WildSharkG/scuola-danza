# Guida al deploy su GitHub

> Versione: 1.0
> Data ultima revisione: 2026-07-24

Questa guida è divisa in due parti pensate per due persone diverse:

- **Parte A — Mettere online il sito**: richiede un minimo di familiarità
  con git/terminale (chi ha sviluppato il sito).
- **Parte B — Modificare i contenuti**: **non richiede nessuna competenza
  tecnica**, si fa dal browser. È la parte da passare a chi gestisce la
  scuola.

Per il contesto più ampio (perché certe scelte, quali header di
sicurezza, cosa NON è coperto da questa guida) vedi anche
`docs/ARCHITETTURA.md` e `docs/DEPLOYMENT.md` (quest'ultimo copre anche
altri host oltre GitHub, es. Netlify o self-hosting).

Nella guida, sostituisci sempre:
- `TUO-UTENTE` con il tuo nome utente (o organizzazione) GitHub
- `scuola-danza` con il nome che dai al repository (se diverso)

---

# Parte A — Mettere online il sito

## A.1 Creare il repository su GitHub

1. Crea un account su https://github.com (se non ne hai già uno).
2. Crea un nuovo repository (bottone "+" in alto → "New repository").
   - Nome: `scuola-danza` (o quello che preferisci).
   - Deve essere **pubblico**: GitHub Pages su un account personale
     gratuito pubblica solo repository pubblici (un repo privato
     richiederebbe GitHub Pro o un account organizzazione con Enterprise).
   - Lascia "Initialize this repository with a README" **deselezionato**
     se stai per caricare un progetto già esistente (il nostro caso).
3. Dalla cartella del progetto in locale, collega il repository e fai il
   primo push del codice sorgente:
   ```
   git init
   git add .
   git commit -m "Primo commit: sito scuola di danza"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/scuola-danza.git
   git push -u origin main
   ```
   **Attenzione**: a differenza di alcuni altri servizi, GitHub **non
   accetta più la semplice password** per `git push` da riga di comando.
   Serve un Personal Access Token (Settings → Developer settings →
   Personal access tokens, da usare al posto della password quando git
   la richiede) oppure una chiave SSH configurata sull'account — altrimenti
   il primo push fallisce con un errore di autenticazione.

   Se `git status` segnala file inattesi prima del commit, controllane il
   contenuto: `.gitignore` è già configurato per escludere `public/`,
   `resources/` e i pattern di file-segreto più comuni (vedi §3 di
   `CLAUDE.md` e `docs/ARCHITETTURA.md` §6).

## A.2 Impostare `baseURL` correttamente (passaggio importante, spesso dimenticato)

GitHub Pages pubblica un repository "normale" (diverso da
`TUO-UTENTE.github.io`) a un **sottopercorso**, non alla radice del
dominio:
```
https://TUO-UTENTE.github.io/scuola-danza/
```
Hugo deve saperlo *prima* di generare il sito, altrimenti CSS/JS/immagini
puntano al posto sbagliato. Apri `hugo.toml` e imposta:
```toml
baseURL = "https://TUO-UTENTE.github.io/scuola-danza/"
```
(Nota: tutti i link a CSS/JS/immagini nei template usano già le funzioni
di Hugo che rispettano `baseURL` automaticamente — non serve toccare
nessun template, basta questa riga.)

Se invece vuoi che il sito sia **il** sito principale del tuo account,
senza sottopercorso (`https://TUO-UTENTE.github.io/`), il repository deve
chiamarsi esattamente `TUO-UTENTE.github.io` — in quel caso usa:
```toml
baseURL = "https://TUO-UTENTE.github.io/"
```
Quando in futuro colleghi un dominio personalizzato (Parte A.5), tornerai
qui a cambiare `baseURL` un'ultima volta con il dominio reale.

## A.3 Attivare "GitHub Actions" come sorgente di Pages (solo la prima volta)

A differenza di Codeberg (dove serve iscriversi separatamente a
ci.codeberg.org), qui basta un'impostazione dentro il repository stesso:

1. Fai il push del codice sorgente (A.1), che include già
   `.github/workflows/deploy.yml` — il workflow che builda e pubblica il
   sito automaticamente.
2. Vai su Settings del repository → **Pages** → sezione "Build and
   deployment" → alla voce "Source" scegli **"GitHub Actions"** (non
   "Deploy from a branch").
3. Vai sulla scheda **Actions** del repository: dovresti già vedere una
   run in corso o completata (scattata dal push appena fatto). Se per
   qualche motivo non parte da sola, apri il workflow "Deploy su GitHub
   Pages" e clicca "Run workflow" per lanciarla a mano la prima volta.

## A.4 Pubblicare il sito (build + deploy) — non serve fare nulla a mano

A differenza di Codeberg, qui **non esiste un passaggio manuale di
pubblicazione**: niente branch `pages`, niente worktree, niente comandi
`rm`/`cp`/`git commit` da rilanciare ogni volta (ed è proprio questa la
classe di problema — la differenza tra sintassi Bash e PowerShell nei
comandi di pubblicazione — che questo meccanismo elimina del tutto).

Ogni volta che fai `git push` su `main`, il workflow parte da solo:
builda il sito, controlla che non ci siano segreti committati per
errore, e pubblica. Puoi seguire il progresso dalla scheda **Actions**;
l'URL pubblico appare sia lì (nel job "deploy") sia in Settings → Pages.
Dopo qualche minuto il sito è visibile su
`https://TUO-UTENTE.github.io/scuola-danza/` (o sull'URL scelto in A.2).

## A.5 Dominio personalizzato (facoltativo, quando la scuola ne avrà uno)

1. Dal pannello DNS del dominio, aggiungi:
   - per un dominio "nudo"/apex (es. `tuosito.it` senza `www`): **4 record
     A** verso questi indirizzi IP di GitHub Pages:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - per un sottodominio (es. `www.tuosito.it`): un record **CNAME** verso
     `TUO-UTENTE.github.io`.
2. In Settings → Pages → "Custom domain", scrivi il dominio scelto e
   salva: GitHub verifica automaticamente il DNS e genera un certificato
   HTTPS per il dominio.
3. **Passaggio che si dimentica facilmente**: con "GitHub Actions" come
   sorgente (a differenza del vecchio meccanismo "Deploy from a branch",
   che scriveva da solo un file `CNAME` nel branch quando impostavi il
   dominio da interfaccia), il file `CNAME` **non viene rigenerato da
   solo ad ogni pubblicazione** — se non lo includi tu nel sorgente, al
   deploy successivo il dominio personalizzato "sparisce". Crea quindi un
   file `static/CNAME` (senza estensione, una sola riga con il dominio,
   es. `www.tuosito.it`, senza `https://` davanti): Hugo lo copia
   automaticamente in `public/CNAME` ad ogni build, cosicché resti
   sempre incluso nel deploy.
4. Aggiorna infine `baseURL` in `hugo.toml` con il dominio definitivo e
   fai un push (si ripubblica da sola, vedi A.4).

## A.6 Limiti di GitHub Pages da tenere presente

- Come Codeberg Pages, serve solo file statici: **non permette di
  impostare header HTTP personalizzati** (niente Content-Security-Policy,
  HSTS, ecc. via header reale). Il sito resta comunque protetto da una
  CSP impostata via tag `<meta>` nell'HTML stesso (funziona ovunque, vedi
  `docs/ARCHITETTURA.md` §6), ma è una protezione parziale. Le opzioni per
  la protezione completa via header HTTP sono descritte in
  `docs/DEPLOYMENT.md` §2.
- Repository **pubblico** richiesto su piano Free personale (vedi A.1).
- Limiti "soft" pubblicati da GitHub (irrilevanti per un sito one-page
  come questo, citati solo per trasparenza): circa 1 GB per il sorgente e
  per il sito pubblicato, circa 100 GB/mese di banda, circa 10 build
  all'ora.
- Nessun file `.nojekyll` necessario con il meccanismo "GitHub Actions"
  scelto qui: l'artefatto caricato viene servito così com'è, senza
  l'elaborazione Jekyll (che, col vecchio meccanismo a branch, ignorava
  di default i file/cartelle che iniziano con `_`, rompendo silenziosamente
  `static/_headers`).

## A.7 CI: il workflow GitHub Actions

Il file `.github/workflows/deploy.yml` esegue, ad ogni push su `main`:
1. una build di verifica (`hugo --gc --minify` deve completare senza
   errori);
2. una scansione dei segreti (`gitleaks`) sul repository;
3. la pubblicazione su GitHub Pages — **solo se sia la build sia la
   scansione segreti sono andate a buon fine**.

Si attiva già da solo dal primo push (vedi A.3) — a differenza di
Woodpecker/Codeberg non serve nessuna iscrizione o abilitazione separata
su un sito esterno. La scansione segreti (gitleaks) è gratuita senza
alcuna configurazione aggiuntiva per un repository di un account
personale; servirebbe un secret `GITLEAKS_LICENSE` (gratuito da
richiedere su gitleaks.io) solo se il repository passasse in futuro a
un'organizzazione GitHub.

Se preferisci non usare la CI, gli stessi due controlli si possono
eseguire in locale prima di ogni commit:
```
hugo --gc --minify
gitleaks detect --source . --no-git -v
```

---

# Parte B — Modificare i contenuti (nessuna competenza tecnica richiesta)

Questa parte è pensata per chi gestisce la scuola e deve aggiornare
corsi, orari, recensioni o contatti **senza installare nulla sul proprio
computer**: si lavora direttamente nel browser, sul sito GitHub.

## B.1 Come aprire un file da modificare

1. Vai su `https://github.com/TUO-UTENTE/scuola-danza` (sostituisci con
   l'indirizzo reale che ti è stato dato).
2. Naviga dentro le cartelle fino al file da modificare (es. clicca su
   `data`, poi su `corsi.yaml`).
3. In alto a destra sul file c'è un'icona a forma di matita ("Edit this
   file"): cliccala per aprire l'editor nel browser.
4. Fai le modifiche (vedi tabella sotto per capire cosa cambiare per ogni
   tipo di contenuto).
5. Scorri in fondo alla pagina: c'è un riquadro "Commit changes". Scrivi
   una breve descrizione di cosa hai cambiato (es. "aggiornato orario del
   lunedì"), lascia selezionato **"Commit directly to the main branch"**
   e clicca sul bottone verde per salvare.

**Buona notizia rispetto a Codeberg**: qui non serve nessun passaggio
ulteriore. Entro pochi minuti dal salvataggio, il workflow GitHub Actions
builda e pubblica da solo la nuova versione — il sito pubblico si
aggiorna automaticamente, sempre, senza che nessuno debba ricordarsi di
"ripubblicare a mano".

## B.2 Cosa modificare, a seconda di cosa vuoi cambiare

Le regole di base per non rompere nulla:
- Nei file che finiscono in `.yaml` (dentro `data/`), rispetta gli spazi
  e i due punti `:` come negli esempi esistenti. Se un testo contiene
  `:`, `#` o è ambiguo, mettilo tra virgolette `"..."`.
- Nei file che finiscono in `.md` (dentro `content/`), c'è un blocco tra
  due righe `---` in cima: lì non cambiare i nomi dei campi (solo il
  testo dopo i due punti). Sotto il secondo `---` c'è testo libero,
  quello lo puoi riscrivere come vuoi.
- Dopo aver salvato, se hai dubbi su come apparirà, chiedi a chi gestisce
  il sito di controllare l'anteprima prima che la CI pubblichi (la trovi
  nella scheda "Actions" mentre gira, oppure aspetta qualche minuto e
  guarda direttamente il sito online).

| Cosa vuoi fare | File da aprire |
|---|---|
| Nascondere/mostrare o riordinare una sezione intera (es. nascondere "Orari" in estate) | `content/sezioni/<nome-sezione>.md` → campo `attivo: true/false`, `ordine: N` |
| Aggiungere/modificare/nascondere un corso | `data/corsi.yaml` (corsi normali) o `data/danzatricita.yaml` |
| Modificare gli orari delle lezioni | `data/orari.yaml` |
| Aggiornare i numeri in "Chi siamo" (anni, allievi, corsi) | `data/contatori.yaml` |
| Aggiungere/modificare/nascondere una recensione | `data/recensioni.yaml` |
| Aggiornare telefono, email, WhatsApp, social, indirizzo, mappa | `data/contatti.yaml` |
| Cambiare i testi introduttivi di una sezione (etichetta, titolo, paragrafo) | `content/sezioni/<nome-sezione>.md` |
| Cambiare i testi/bottoni della prima schermata (hero) | `content/_index.md` |
| Sostituire logo e favicon con quelli definitivi | cartella `static/img/` (stesso nome file, vedi `README.md`) |

Per lo schema dettagliato campo per campo di ogni file YAML, fai
riferimento ai commenti già presenti dentro ciascun file (ogni file
`data/*.yaml` inizia con qualche riga di spiegazione) e a `README.md`
nella radice del progetto, che copre lo stesso argomento con qualche
dettaglio in più per chi sviluppa il sito.

## B.3 Dopo la modifica

Non serve fare nient'altro: entro qualche minuto dal salvataggio il sito
pubblico si aggiorna da solo. Se sei curioso di seguire il progresso in
tempo reale, apri la scheda "Actions" del repository — vedrai la run in
corso e, quando diventa verde, il sito è aggiornato.
