# Security-First Development Guidelines

> **PRIORITÀ ASSOLUTA**: La sicurezza non è opzionale. Ogni modifica, ogni riga di codice
> generata o suggerita DEVE rispettare questi standard. In caso di dubbio tra convenienza
> e sicurezza, scegli sempre la sicurezza.

---

## 1. Principi fondamentali

- Applica **Secure by Default**: ogni componente deve essere sicuro nella configurazione predefinita
- Segui il principio del **Least Privilege**: ogni entità ottiene solo i permessi strettamente necessari
- Adotta la **Defense in Depth**: più livelli di protezione, nessun punto di fallimento singolo
- Usa **Fail Securely**: in caso di errore, il sistema deve fallire in modo sicuro (nega l'accesso, non concederlo)
- Mantieni **Zero Trust**: non fidarti di nessun input, nessun utente, nessun sistema per default

---

## 2. OWASP Top 10 — Regole per ogni modifica

### A01 — Broken Access Control
- Implementa controlli di accesso lato server su OGNI endpoint, nessuna eccezione
- Nega l'accesso per default; concedilo esplicitamente solo dove necessario
- Non esporre ID sequenziali prevedibili (usa UUID v4 o ULID)
- Verifica la proprietà della risorsa prima di ogni operazione (es. `user.id === resource.ownerId`)
- Implementa CORS con whitelist esplicita, mai `Access-Control-Allow-Origin: *` in produzione
- Registra nei log ogni accesso negato

### A02 — Cryptographic Failures
- Usa **HTTPS ovunque**, inclusi ambienti di staging
- Non trasmettere mai dati sensibili in chiaro (URL, log, header)
- Per le password usa esclusivamente **bcrypt** (cost ≥ 12), **Argon2id**, o **scrypt**
- Per la crittografia usa **AES-256-GCM** o **ChaCha20-Poly1305**
- Non implementare mai algoritmi crittografici custom
- Non usare MD5 o SHA-1 per scopi di sicurezza; usa SHA-256 o superiori
- Genera token e nonce con CSPRNG (`crypto.randomBytes`, `secrets.token_bytes`)
- Ruota le chiavi crittografiche periodicamente

### A03 — Injection
- Usa **prepared statements** / **query parametrizzate** per OGNI query al database, senza eccezioni
- Non costruire query concatenando stringhe con input utente
- Valida e sanitizza tutto l'input lato server, indipendentemente dalla validazione client
- Usa ORM/query builder che parametrizzano automaticamente
- Per comandi di sistema, evita shell injection con argomenti separati (no `exec("cmd " + input)`)
- Applica **allowlist** per i valori attesi, non blocklist

```js
// ❌ MAI
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// ✅ SEMPRE
db.query('SELECT * FROM users WHERE id = ?', [userId])
```

### A04 — Insecure Design
- Esegui **threat modeling** prima di implementare nuove feature
- Definisci i requisiti di sicurezza nella fase di design, non in retrospettiva
- Implementa **rate limiting** su tutti gli endpoint di autenticazione e API pubbliche
- Progetta tenendo conto del caso peggiore: cosa succede se l'attaccante ottiene X?

### A05 — Security Misconfiguration
- Rimuovi tutti i componenti, feature e documentazione non necessari in produzione
- Non esporre stack trace, messaggi di errore dettagliati o versioni software in produzione
- Cambia tutte le credenziali di default prima del deploy
- Disabilita directory listing sui web server
- Configura header di sicurezza HTTP (vedi sezione 6)
- Usa configurazioni diverse per dev, staging e produzione

### A06 — Vulnerable and Outdated Components
- Esegui `npm audit` / `pip-audit` / equivalente ad ogni PR
- Aggiorna le dipendenze regolarmente; non accumulare ritardo
- Non includere librerie inutilizzate
- Verifica l'integrità dei package con checksum (lockfile sempre in git)
- Monitora CVE per le dipendenze critiche (usa Dependabot o Snyk)

### A07 — Identification and Authentication Failures
- Implementa **multi-factor authentication** per account privilegiati
- Blocca account dopo N tentativi falliti (lockout temporaneo + notifica)
- Usa token di sessione crittograficamente casuali (≥ 128 bit)
- Invalida la sessione lato server al logout, non solo lato client
- Imposta scadenza sui token: access token brevi (15 min), refresh token più lunghi con rotazione
- Non esporre informazioni che permettono l'enumeration degli utenti
- Implementa reset password sicuro (token monouso, scadenza breve, link via email)

### A08 — Software and Data Integrity Failures
- Verifica l'integrità di file scaricati da CDN con **Subresource Integrity** (SRI)
- Non deserializzare dati non fidati senza validazione
- Usa pipeline CI/CD con controlli di sicurezza automatizzati
- Firma i pacchetti e gli artefatti di build
- Non fidarti di dati provenienti da cookie, header o URL senza validazione

### A09 — Security Logging and Monitoring Failures
- Logga tutti gli eventi di autenticazione (successi e fallimenti)
- Logga ogni accesso negato e ogni operazione su dati sensibili
- **MAI** loggare: password, token, dati di carte, PII non necessaria
- Includi nei log: timestamp, user ID, IP, azione, risorsa, esito
- Usa un formato strutturato (JSON) per i log
- Centralizza i log in un sistema separato (non modificabile dall'applicazione)
- Imposta alert su pattern anomali (es. molti fallimenti in breve tempo)

### A10 — Server-Side Request Forgery (SSRF)
- Valida e sanitizza tutti gli URL forniti dall'utente prima di fare richieste
- Usa allowlist di domini/IP permessi per le richieste server-side
- Blocca richieste a indirizzi privati (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x)
- Disabilita redirect automatici o validali dopo ogni hop

---

## 3. Gestione di segreti e credenziali

- **MAI** hardcodare segreti, API key, password o token nel codice sorgente
- **MAI** committare file `.env` contenenti valori reali
- Usa variabili d'ambiente per tutti i segreti in runtime
- In produzione usa un secret manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager)
- Ruota i segreti regolarmente e dopo ogni sospetta compromissione
- Usa segreti diversi per ogni ambiente (dev/staging/prod)

```bash
# .gitignore — sempre presente, senza eccezioni
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
*.p12
*.pfx
secrets/
```

- Scansiona il codice per segreti accidentali prima di ogni commit (`git-secrets`, `truffleHog`, `gitleaks`)

---

## 4. Validazione e sanitizzazione dell'input

- Valida **tipo**, **formato**, **lunghezza** e **range** di ogni input ricevuto
- Usa sempre **allowlist** (cosa è permesso) invece di blocklist (cosa è vietato)
- Tronca l'input a lunghezze massime ragionevoli
- Rifiuta input malformati con errori chiari ma non informativi per l'attaccante
- Per i file caricati: valida tipo MIME lato server (non fidarti dell'estensione), limita dimensione, salva fuori dalla webroot, scansiona per malware dove possibile
- Non eseguire mai contenuto proveniente dall'input utente

---

## 5. Prevenzione XSS

- Esegui sempre **output encoding** contestuale prima di renderizzare dati nel DOM
- In React/Vue/Angular: usa le API native del framework (non `innerHTML`, non `dangerouslySetInnerHTML` senza sanitizzazione)
- Imposta **Content Security Policy** (CSP) restrittiva (vedi sezione 6)
- Usa `textContent` invece di `innerHTML` quando il contenuto è testo puro

```js
// ❌ Vulnerabile a XSS
element.innerHTML = userInput

// ✅ Sicuro
element.textContent = userInput
```

---

## 6. Header di sicurezza HTTP

Ogni risposta HTTP deve includere questi header:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- Rimuovi header che espongono tecnologia: `Server`, `X-Powered-By`, `X-AspNet-Version`
- Configura cookie con: `HttpOnly; Secure; SameSite=Strict` (o `Lax` se necessario)

---

## 7. Autenticazione e sessioni

- Usa **JWT** solo se necessario; preferisci sessioni server-side con session ID opaco
- Se usi JWT: firma con RS256/ES256 (non HS256 in sistemi distribuiti), valida sempre `exp`, `iss`, `aud`
- Non memorizzare JWT in localStorage (vulnerabile a XSS); usa cookie `HttpOnly`
- Implementa token refresh con rotazione (ogni refresh invalida il vecchio refresh token)
- Invalida tutti i token attivi in caso di cambio password o compromissione
- Implementa logout sicuro lato server

---

## 8. Sicurezza del database

- Usa prepared statements / query parametrizzate sempre (vedi A03)
- Connetti al DB con un utente con privilegi minimi necessari
- Non usare l'utente `root` o `admin` del DB per l'applicazione
- Cifra i dati sensibili a riposo (dati personali, finanziari, sanitari)
- Effettua backup regolari cifrati e testane il ripristino
- Non esporre il DB direttamente su internet; usa VPC/rete privata

---

## 9. Gestione degli errori

- **Mai** esporre stack trace, query SQL, percorsi di file o dettagli interni in produzione
- Restituisci all'utente messaggi di errore generici ma utili
- Logga internamente i dettagli completi dell'errore con correlation ID
- Non rivelare se un utente esiste o meno nelle risposte di errore di autenticazione

```js
// ❌ Espone dettagli interni
res.status(500).json({ error: err.stack })

// ✅ Sicuro
logger.error({ err, correlationId })
res.status(500).json({ error: 'Si è verificato un errore. Riprova più tardi.', correlationId })
```

---

## 10. Rate limiting e protezione da abuso

- Implementa rate limiting su: login, registrazione, reset password, OTP, API pubbliche
- Usa sliding window o token bucket per maggiore precisione
- Distingui per IP e per account utente
- Implementa CAPTCHA dopo N tentativi falliti su endpoint critici
- Restituisci `429 Too Many Requests` con header `Retry-After`

---

## 11. Dipendenze e supply chain

- Blocca le versioni delle dipendenze nel lockfile (`package-lock.json`, `poetry.lock`, ecc.)
- Committa sempre il lockfile in git
- Controlla le dipendenze transitive, non solo quelle dirette
- Prima di aggiungere una dipendenza: valuta manutenzione attiva, popolarità, numero di dipendenti
- Preferisci dipendenze con pochi sotto-dipendenti (minore superficie di attacco)
- Non usare pacchetti abbandonati o con CVE noti non patchati

---

## 12. CI/CD e pipeline di sicurezza

Ogni pipeline deve includere:

- [ ] Linting con regole di sicurezza (ESLint security plugin, Bandit per Python)
- [ ] SAST (Static Application Security Testing): Semgrep, CodeQL, SonarQube
- [ ] Dependency scanning: `npm audit`, Snyk, Dependabot
- [ ] Secret scanning: gitleaks, truffleHog
- [ ] Container scanning (se applicabile): Trivy, Grype
- [ ] Test di sicurezza automatizzati

Blocca il merge se uno di questi controlli fallisce con severity alta o critica.

---

## 13. Dati personali e privacy (GDPR/Privacy by Design)

- Raccogli solo i dati strettamente necessari (**data minimization**)
- Definisci e rispetta le retention policy (cancella i dati quando non più necessari)
- Cifra i dati personali a riposo e in transito
- Implementa il diritto alla cancellazione (right to erasure)
- Anonimizza o pseudonimizza i dati dove possibile
- Non inserire PII in URL, query string o log

---

## 14. Checklist pre-commit

Prima di ogni commit verifica:

- [ ] Nessun segreto o credenziale nel codice
- [ ] Tutti gli input validati e sanitizzati lato server
- [ ] Nessuna query SQL costruita con concatenazione di stringhe
- [ ] Tutti gli endpoint protetti da autenticazione/autorizzazione appropriata
- [ ] Nessun messaggio di errore che espone dettagli interni
- [ ] Dipendenze aggiornate e senza vulnerabilità note (`npm audit`)
- [ ] Header di sicurezza HTTP configurati
- [ ] Log non contengono dati sensibili

---

## 15. Checklist pre-deploy in produzione

- [ ] Variabili d'ambiente di produzione configurate (mai valori di default)
- [ ] Debug mode disabilitato
- [ ] HTTPS forzato con redirect da HTTP
- [ ] Header di sicurezza HTTP verificati (usa securityheaders.com)
- [ ] CSP configurata e testata
- [ ] Rate limiting attivo sugli endpoint critici
- [ ] Log centralizzati e alert configurati
- [ ] Backup del database verificato e testato
- [ ] Dependency audit pulito
- [ ] Revisione manuale delle modifiche ai controlli di accesso

---

## 16. Documentazione tecnica — obbligo di aggiornamento

La cartella `docs/` contiene la documentazione ufficiale del progetto destinata al team di sicurezza e alle operazioni.

| File | Contenuto |
|---|---|
| `docs/ARCHITETTURA.md` | Architettura, stack, API, controlli di sicurezza, raccomandazioni |
| `docs/DEPLOYMENT-WINDOWS.md` | Guida al deployment su Windows Server on-premises |

**Regola obbligatoria:** Ad ogni modifica al progetto che impatti uno dei seguenti aspetti, aggiornare il documento pertinente **nello stesso commit**:

- Nuovi endpoint API o modifica di quelli esistenti → `ARCHITETTURA.md § 7`
- Modifiche allo schema database → `ARCHITETTURA.md § 6`
- Aggiunta/rimozione/aggiornamento dipendenze npm → `ARCHITETTURA.md § 3`
- Modifiche ai controlli di sicurezza (Helmet, rate limit, CSP, ecc.) → `ARCHITETTURA.md § 8`
- Modifiche a ruoli/permessi → `ARCHITETTURA.md § 10`
- Modifiche al logging → `ARCHITETTURA.md § 11`
- Nuove vulnerabilità identificate o remediate → `ARCHITETTURA.md § 12`
- Modifiche alla configurazione di deployment → `DEPLOYMENT-WINDOWS.md`

Aggiornare sempre il campo "Data ultima revisione" e il numero di versione in testa ai documenti.

---

## Riferimenti

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/Projects/ssdf)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)
