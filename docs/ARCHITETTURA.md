# Architettura — A un passo dal sogno

> Versione: 1.1
> Data ultima revisione: 2026-07-25

Questo documento applica al progetto le linee guida di sicurezza in
`CLAUDE.md`, con un'analisi onesta di cosa si applica e cosa no. `CLAUDE.md`
è scritto pensando a un'applicazione web dinamica tipica (backend, database,
autenticazione, API). Questo progetto **non è quel tipo di applicazione**:
è un sito **statico** generato con Hugo, senza server applicativo, senza
database, senza account utente. Molte delle regole di `CLAUDE.md` non hanno
quindi un equivalente diretto — questo documento spiega esplicitamente
dove e perché, invece di forzare una conformità solo apparente.

---

## 1. Panoramica

- **Tipo di progetto**: sito one-page statico per una scuola di danza.
- **Generatore**: [Hugo](https://gohugo.io/) (versione extended).
- **Output**: file HTML/CSS/JS statici in `public/`, serviti da un host
  qualsiasi (nessun server applicativo richiesto in runtime).
- **Interattività lato client**: vanilla JavaScript scritto a mano (menu
  mobile, fade-in allo scroll, contatori animati, mappa "click-to-load").
  Nessun framework, nessuna libreria esterna.
- **Contenuti**: testi in Markdown (`content/`), elenchi strutturati in
  YAML (`data/`). Editabili senza competenze tecniche (vedi `README.md`).

## 2. Cosa NON esiste in questo progetto (e perché è rilevante per la sicurezza)

- Nessun database.
- Nessuna API/endpoint server-side.
- Nessun sistema di login, account utente o sessione.
- Nessun form che raccoglie dati dai visitatori (contatti = link
  `tel:`/`mailto:`/WhatsApp, gestiti dal dispositivo del visitatore, non
  dal sito).
- Nessun cookie, nessun tracker, nessun analytics.
- Nessuna dipendenza npm/pip in runtime (Hugo è un binario standalone; il
  JS non usa librerie).

Questo non è un'omissione: è una scelta di design esplicita (vedi
conversazione di progettazione) che elimina intere categorie di rischio
alla radice, invece di doverle mitigare in un secondo momento.

## 3. Dipendenze

- **Hugo**: v0.163.3 extended (versione usata in sviluppo — verificabile
  con `hugo version`). Nessun `package.json`/lockfile: non ci sono
  dipendenze JavaScript o Python in runtime.
- **Font**: font serif di sistema (`Cormorant Garamond` con fallback a
  `EB Garamond`/`Garamond`/`Georgia`), nessun font scaricato da CDN
  esterni.
- **Script Python di supporto** (`scripts/genera_placeholder.py`): usa
  solo la libreria standard di Python, nessuna dipendenza esterna.
- **Raccomandazione**: quando si aggiorna Hugo, verificare il changelog
  per deprecazioni (già successo due volte in questo progetto: `_build` →
  `build`, `.Site.Data` → `hugo.Data`).

## 4. Database

**Non applicabile.** Nessun database è usato o previsto. Tutti i
"contenuti" sono file di testo versionati in Git (Markdown + YAML).

## 5. API

**Non applicabile.** Non esiste alcun endpoint server-side. Il sito è
composto esclusivamente da file statici pre-generati in fase di build.

## 6. Controlli di sicurezza implementati

| Controllo | Stato | Dettaglio |
|---|---|---|
| Content Security Policy | ✅ | Impostata via `<meta http-equiv>` in `layouts/partials/head.html` (funziona su qualsiasi host) e via header HTTP reale in `static/_headers` (Netlify/Cloudflare Pages) e `static/web.config` (IIS). `frame-ancestors` è impostabile solo via header HTTP, non via meta tag: presente nelle config host, assente nel meta tag. |
| Subresource Integrity (SRI) | ✅ | CSS e JS caricati con attributo `integrity` generato automaticamente da Hugo Pipes (`resources.Fingerprint`) ad ogni build. |
| Niente inline script/style | ✅ | Verificato: nessun `style="..."`, `onclick="..."`, `<script>` inline, `innerHTML`, `eval()` nei template o nel JS. La CSP `script-src 'self'; style-src 'self'` non richiede quindi `'unsafe-inline'`. |
| Output encoding / anti-XSS | ✅ | Tutti i contenuti editabili (recensioni, corsi, testi sezione) passano per l'auto-escaping contestuale di default dei template Go/Hugo. Nessun uso di `safeHTML`/`safeJS`/`safeCSS` sui contenuti provenienti da YAML/Markdown. |
| HSTS | ✅ (dove l'host lo supporta) | In `static/_headers` e `static/web.config`. Non impostabile via meta tag. |
| X-Frame-Options / Referrer-Policy / X-Content-Type-Options / Permissions-Policy | ⚠️ parziale | Referrer-Policy anche via meta tag (funziona ovunque). Gli altri richiedono header HTTP reale: dipendono dall'host finale, vedi `docs/DEPLOYMENT.md`. |
| Rimozione header che espongono la tecnologia (`X-Powered-By`, `Server`) | ✅ (dove l'host lo supporta) | Configurato in `static/web.config` per IIS. Su hosting statico gestito (Netlify, GitHub Pages...) dipende dalla piattaforma, non controllabile dal progetto. |
| Mappa "click-to-load" | ✅ | Nessuna richiesta di terze parti (Google) caricata di default: solo al click esplicito dell'utente. Riduce l'esposizione dei dati dei visitatori verso terzi. |
| Nessun tracker/analytics/cookie | ✅ | Scelta di design esplicita — coerente con data minimization (vedi §10). |
| Segreti nel codice | ✅ nessuno presente | Verificato con scansione manuale del repository. `.gitignore` include comunque i pattern di file-segreto standard per prevenzione futura. |
| Scansione automatica dei segreti in CI | ✅ (attiva dal primo push) | `.github/workflows/deploy.yml` esegue `gitleaks` ad ogni push su `main` e blocca la pubblicazione se trova un segreto. Si attiva già da solo — basta l'impostazione una tantum descritta in `docs/DEPLOYMENT-GITHUB.md` (nessuna abilitazione manuale separata su un sito esterno, a differenza di quanto richiedeva Woodpecker su ci.codeberg.org). |

## 7. Ruoli e permessi

**Non applicabile a livello applicativo**: non esistono ruoli o permessi
nel sito stesso (nessun login). L'unico controllo di accesso rilevante è
**chi ha permesso di scrittura sul repository Git** — questo va gestito
con gli strumenti della piattaforma di hosting del codice (es. permessi
collaboratori su GitHub), non dal sito.

## 8. Logging e monitoraggio

**Non applicabile a livello applicativo**: non esiste codice server-side
che genera log (nessun server, nessuna sessione, nessun dato sensibile da
tracciare). Eventuali log di accesso HTTP (IP, user-agent, pagine
visitate) sono generati e gestiti dalla piattaforma di hosting scelta, non
dal codice di questo progetto. Se in futuro si aggiungesse un qualunque
sistema di raccolta dati (es. un modulo di analisi traffico), andrebbe
valutato alla luce di §10 (minimizzazione dati) e del fatto che oggi il
sito non richiede alcun consenso cookie proprio perché non traccia nulla.

## 9. Valutazione OWASP Top 10 (rispetto a `CLAUDE.md` §2)

| Categoria | Applicabilità | Motivazione |
|---|---|---|
| A01 Broken Access Control | **N/A** | Nessun endpoint, nessuna sessione, nessuna risorsa protetta da controllare. |
| A02 Cryptographic Failures | Parziale | Nessun dato sensibile da cifrare (nessun DB), ma HTTPS/HSTS raccomandati e configurati per l'integrità del trasporto. |
| A03 Injection | **N/A** (SQL/comandi) | Nessun database, nessuna esecuzione di comandi con input utente. Rischio XSS residuo mitigato dall'auto-escaping di Hugo (verificato, vedi §6). |
| A04 Insecure Design | Applicato | Intere classi di rischio eliminate a monte: niente form, niente login, niente storage lato server. |
| A05 Security Misconfiguration | Applicato | Header di sicurezza configurati, directory listing disabilitato (IIS), nessun componente superfluo in produzione (solo `public/` viene deployato). |
| A06 Vulnerable/Outdated Components | Applicato | Nessuna dipendenza runtime; unica "dipendenza" è Hugo stesso, versione tracciata. |
| A07 Identification and Authentication Failures | **N/A** | Non esiste alcun sistema di autenticazione nel progetto. |
| A08 Software and Data Integrity Failures | Applicato | SRI su CSS/JS (vedi §6). |
| A09 Security Logging and Monitoring Failures | **N/A** applicativo | Vedi §8. |
| A10 SSRF | **N/A** | Il sito non effettua richieste HTTP lato server; l'unica richiesta verso terzi (mappa) parte dal browser del visitatore al click. |

## 10. Privacy e dati personali (rispetto a `CLAUDE.md` §13)

Il sito **non raccoglie alcun dato personale dai visitatori**: nessun
form, nessun cookie, nessun analytics. I link `tel:`/`mailto:`/WhatsApp
in Contatti aprono l'app del dispositivo del visitatore — è
un'interazione diretta fra il visitatore e WhatsApp/il suo client email,
il sito non intermedia né conserva nulla. Questo rappresenta la
minimizzazione dei dati (*data minimization*) applicata nel modo più
rigoroso possibile: non c'è nulla da cancellare, anonimizzare o proteggere
perché non viene raccolto nulla. L'unico punto di attenzione è la mappa
Google Maps incorporata: si carica solo al click esplicito dell'utente
(vedi §6), per ridurre al minimo il contatto con server di terze parti.

## 11. Vulnerabilità note

Nessuna nota al momento della stesura di questo documento. Sezione da
aggiornare ad ogni scoperta o remediation futura (vedi obbligo in
`CLAUDE.md` §16).

---

**Cross-reference con `CLAUDE.md` §16**: questo file sostituisce
concettualmente le sezioni "API", "schema database", "controlli di
sicurezza", "ruoli/permessi", "logging" previste per un progetto
applicativo standard, adattandole (o dichiarandole non applicabili) alla
realtà di un sito statico. Aggiornare questo documento — non `CLAUDE.md`
— ad ogni modifica che tocchi uno di questi aspetti.
