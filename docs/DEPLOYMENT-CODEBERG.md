# Guida al deploy su Codeberg

> Versione: 1.0
> Data ultima revisione: 2026-07-20

Questa guida è divisa in due parti pensate per due persone diverse:

- **Parte A — Mettere online il sito**: richiede un minimo di familiarità
  con git/terminale (chi ha sviluppato il sito).
- **Parte B — Modificare i contenuti**: **non richiede nessuna competenza
  tecnica**, si fa dal browser. È la parte da passare a chi gestisce la
  scuola.

Per il contesto più ampio (perché certe scelte, quali header di
sicurezza, cosa NON è coperto da questa guida) vedi anche
`docs/ARCHITETTURA.md` e `docs/DEPLOYMENT.md` (quest'ultimo copre anche
altri host oltre Codeberg, es. Netlify o self-hosting).

Nella guida, sostituisci sempre:
- `TUO-UTENTE` con il tuo nome utente Codeberg
- `scuola-danza` con il nome che dai al repository (se diverso)

---

# Parte A — Mettere online il sito

## A.1 Creare il repository su Codeberg

1. Crea un account su https://codeberg.org (se non ne hai già uno).
2. Crea un nuovo repository (bottone "+" in alto → "New Repository").
   - Nome: `scuola-danza` (o quello che preferisci).
   - Lascia "Initialize Repository" **deselezionato** se stai per
     caricare un progetto già esistente (il nostro caso).
3. Dalla cartella del progetto in locale, collega il repository e fai il
   primo push del codice sorgente:
   ```
   git init
   git add .
   git commit -m "Primo commit: sito scuola di danza"
   git branch -M main
   git remote add origin https://codeberg.org/TUO-UTENTE/scuola-danza.git
   git push -u origin main
   ```
   Se `git status` segnala file inattesi prima del commit, controllane il
   contenuto: `.gitignore` è già configurato per escludere `public/`,
   `resources/` e i pattern di file-segreto più comuni (vedi §3 di
   `CLAUDE.md` e `docs/ARCHITETTURA.md` §6).

## A.2 Impostare `baseURL` correttamente (passaggio importante, spesso dimenticato)

Codeberg Pages pubblica un repository "normale" (non chiamato `pages`) a
un **sottopercorso**, non alla radice del dominio:
```
https://TUO-UTENTE.codeberg.page/scuola-danza/
```
Hugo deve saperlo *prima* di generare il sito, altrimenti CSS/JS/immagini
puntano al posto sbagliato. Apri `hugo.toml` e imposta:
```toml
baseURL = "https://TUO-UTENTE.codeberg.page/scuola-danza/"
```
(Nota: tutti i link a CSS/JS/immagini nei template usano già le funzioni
di Hugo che rispettano `baseURL` automaticamente — non serve toccare
nessun template, basta questa riga.)

Se invece vuoi che il sito sia **il** sito principale del tuo account,
senza sottopercorso (`https://TUO-UTENTE.codeberg.page/`), il repository
deve chiamarsi esattamente `pages` — in quel caso usa:
```toml
baseURL = "https://TUO-UTENTE.codeberg.page/"
```
Quando in futuro colleghi un dominio personalizzato (Parte A.5), tornerai
qui a cambiare `baseURL` un'ultima volta con il dominio reale.

## A.3 Creare il branch `pages` (solo la prima volta)

Codeberg Pages pubblica il contenuto di un branch chiamato **`pages`**
(diverso da `main`, che contiene i sorgenti). Si crea una volta sola:

```
git checkout --orphan pages
git rm -rf .
git commit --allow-empty -m "Branch pages: pronto per la pubblicazione"
git push -u origin pages
git checkout main
```

Poi crea un "worktree" dedicato: una seconda cartella collegata allo
stesso repository ma sul branch `pages`, comoda per pubblicare senza mai
toccare `main`:
```
git worktree add ../scuola-danza-pages pages
```

## A.4 Pubblicare il sito (build + deploy)

Ogni volta che vuoi pubblicare le modifiche:
```
hugo --gc --minify
rm -rf ../scuola-danza-pages/*
cp -r public/* ../scuola-danza-pages/
cd ../scuola-danza-pages
git add -A
git commit -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push origin pages
cd ../scuola-danza
```
Dopo qualche istante il sito è visibile su
`https://TUO-UTENTE.codeberg.page/scuola-danza/` (o sull'URL scelto in
A.2). Conviene salvare questi comandi in uno script (es.
`scripts/pubblica.sh`) per non doverli riscrivere ogni volta.

## A.5 Dominio personalizzato (facoltativo, quando la scuola ne avrà uno)

1. Dal pannello DNS del dominio, aggiungi un record:
   - `CNAME www codeberg.page` (per un sottodominio come `www.tuosito.it`)
   - oppure un record `ALIAS`/`ANAME` verso `codeberg.page` se serve
     collegare il dominio "nudo" (root, es. `tuosito.it` senza `www`),
     dato che i record `CNAME` non sono ammessi sulla radice di un
     dominio.
2. Nel branch `pages` del repository, aggiungi un file `.domains`
   contenente il dominio, una riga per dominio:
   ```
   tuosito.it
   www.tuosito.it
   ```
3. Aggiorna `baseURL` in `hugo.toml` con il dominio definitivo e ripubblica
   (A.4).

## A.6 Limiti di Codeberg Pages da tenere presente

Codeberg Pages serve solo file statici: **non permette di impostare
header HTTP personalizzati** (niente Content-Security-Policy, HSTS, ecc.
via header reale). Il sito resta comunque protetto da una CSP impostata
via tag `<meta>` nell'HTML stesso (funziona ovunque, vedi
`docs/ARCHITETTURA.md` §6), ma è una protezione parziale. Se in futuro
servirà la protezione completa via header HTTP, le opzioni sono descritte
in `docs/DEPLOYMENT.md` §2 (es. mettere un CDN/proxy come Cloudflare
davanti al dominio, oppure cambiare host).

## A.7 Pipeline CI (Woodpecker): build automatica di verifica

Il file `.woodpecker.yml` nella radice del progetto è già pronto: builda
il sito e scansiona il repository alla ricerca di segreti ad ogni push.
Per attivarlo (una tantum): vai su https://ci.codeberg.org, accedi con
l'account Codeberg e abilita il repository dalla lista. Da quel momento
gira automaticamente ad ogni push su `main` — **ma non pubblica da sola**
sul branch `pages`: quello resta un passaggio manuale (A.4), a meno di
impostare la pubblicazione automatica descritta sotto.

### (Avanzato, facoltativo) Pubblicazione automatica ad ogni modifica

Per far sì che ogni modifica ai contenuti (fatta anche da browser, vedi
Parte B) diventi visibile online **senza dover rilanciare A.4 a mano**,
si può aggiungere alla pipeline CI uno step che pubblica da solo sul
branch `pages` dopo ogni push su `main`. Richiede un token di accesso
Codeberg con permesso di scrittura sul repository, salvato come **secret**
di Woodpecker (mai nel codice, vedi `CLAUDE.md` §3): Impostazioni
repository su ci.codeberg.org → "Secrets" → aggiungi `codeberg_token`.

Poi aggiungi a `.woodpecker.yml`:
```yaml
  deploy-pages:
    image: alpine/git
    when:
      branch: main
      event: push
    environment:
      CODEBERG_TOKEN:
        from_secret: codeberg_token
    commands:
      - git config --global user.email "ci@codeberg.local"
      - git config --global user.name "Woodpecker CI"
      - git clone --branch pages "https://$${CODEBERG_TOKEN}@codeberg.org/TUO-UTENTE/scuola-danza.git" /tmp/pages-deploy
      - rm -rf /tmp/pages-deploy/*
      - cp -r public/* /tmp/pages-deploy/
      - cd /tmp/pages-deploy && git add -A && git commit -m "Deploy automatico" --allow-empty && git push origin pages
```
Valuta questo compromesso consapevolmente: comodità di pubblicazione
automatica contro un token con permessi di scrittura conservato nella CI
(superficie d'attacco in più, vedi `docs/ARCHITETTURA.md` §6). Per un
sito aggiornato poche volte al mese, il deploy manuale (A.4) resta
l'opzione più semplice e sicura; conviene passare all'automazione solo se
gli aggiornamenti diventano frequenti.

---

# Parte B — Modificare i contenuti (nessuna competenza tecnica richiesta)

Questa parte è pensata per chi gestisce la scuola e deve aggiornare
corsi, orari, recensioni o contatti **senza installare nulla sul proprio
computer**: si lavora direttamente nel browser, sul sito Codeberg.

## B.1 Come aprire un file da modificare

1. Vai su `https://codeberg.org/TUO-UTENTE/scuola-danza` (sostituisci con
   l'indirizzo reale che ti è stato dato).
2. Naviga dentro le cartelle fino al file da modificare (es. clicca su
   `data`, poi su `corsi.yaml`).
3. In alto a destra sul file c'è un'icona a forma di matita ("Modifica
   file") o simile: cliccala per aprire l'editor nel browser.
4. Fai le modifiche (vedi elenco sotto per capire cosa cambiare per ogni
   tipo di contenuto).
5. Scorri in fondo alla pagina: c'è un riquadro "Commit dei cambiamenti".
   Scrivi una breve descrizione di cosa hai cambiato (es. "aggiornato
   orario del lunedì") e clicca sul bottone verde per salvare.

**Importante**: questo salva la modifica nei file sorgenti del sito
(branch `main`), ma **il sito pubblico non si aggiorna da solo** finché
qualcuno non esegue il passaggio di pubblicazione (Parte A.4) — a meno
che non sia stata attivata la pubblicazione automatica (Parte A.7,
avanzato). Concordate con chi gestisce il sito quanto spesso ripubblicare
dopo le modifiche.

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
  il sito di controllare l'anteprima prima di ripubblicare.

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

Segnala (o pubblica tu stesso, se hai seguito la Parte A) che ci sono
modifiche da mettere online. Se è stata attivata la pubblicazione
automatica (Parte A.7), non serve fare nient'altro: entro qualche minuto
dal salvataggio il sito pubblico si aggiorna da solo.
