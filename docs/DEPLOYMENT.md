# Deployment — A un passo dal sogno

> Versione: 1.1
> Data ultima revisione: 2026-07-25

**Nota sul nome del file**: `CLAUDE.md` §16 prevede un file chiamato
`docs/DEPLOYMENT-WINDOWS.md`, presupponendo un deployment su Windows
Server on-premises. Per questo progetto l'hosting scelto è **GitHub
Pages** (vedi la guida dedicata `docs/DEPLOYMENT-GITHUB.md`, che copre
anche l'attivazione della CI e la modifica dei contenuti senza
competenze tecniche). Questo documento resta un riferimento generico
multi-host, utile se in futuro servisse un'alternativa (Netlify,
self-hosting Windows/IIS o Linux/Nginx) — include comunque una sezione
dedicata a Windows/IIS che risponde all'esigenza originale del nome del
file previsto da `CLAUDE.md`.

---

## 1. Build

```
hugo --gc --minify
```

Genera la cartella `public/` con il sito pronto per la pubblicazione.
**Va deployato solo il contenuto di `public/`**, mai il resto del
repository (sorgenti, `content/`, `data/`, `layouts/`...). Questo separa
"ambiente di sviluppo" da "produzione" nello spirito di `CLAUDE.md` §5/§15:
`hugo server` (con live reload, bozze, ecc.) è **solo per lo sviluppo
locale** e non va mai esposto pubblicamente.

## 2. Header di sicurezza HTTP: cosa serve sapere prima di scegliere l'host

Una parte degli header richiesti da `CLAUDE.md` §6 è già impostata in modo
universale via `<meta>` tag nel sorgente (funziona su qualunque host, vedi
`docs/ARCHITETTURA.md` §6). La parte restante (HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, `Permissions-Policy`, `frame-ancestors`)
richiede che l'host servente imposti header HTTP reali — **non tutte le
piattaforme di hosting statico lo permettono**.

| Host | Supporta header custom? | Come |
|---|---|---|
| Netlify | Sì | Legge `static/_headers` automaticamente (già incluso nel progetto) |
| Cloudflare Pages | Sì | Stesso formato `_headers` di Netlify |
| GitHub Pages | **No** | Serve solo file statici, non permette header custom. Serve un CDN/proxy davanti (es. Cloudflare in modalità proxy) se si vogliono gli header completi — vedi `docs/DEPLOYMENT-GITHUB.md` §A.6 |
| Self-hosting IIS (Windows Server) | Sì | Usa `static/web.config`, già incluso nel progetto (vedi §3 sotto) |
| Self-hosting Nginx | Sì | Vedi snippet in §4 sotto |

Se l'host scelto non supporta header custom, il sito resta comunque
protetto dalla CSP via `<meta>` tag (tranne `frame-ancestors`) — una
protezione parziale ma reale, meglio di niente.

## 3. Self-hosting su Windows Server con IIS

1. Installa IIS con il ruolo "Web Server (IIS)".
2. (Necessario solo per il redirect automatico HTTP→HTTPS) Installa il
   modulo gratuito Microsoft **URL Rewrite** per IIS. Se non lo installi,
   rimuovi il blocco `<rewrite>...</rewrite>` da `static/web.config`
   prima del deploy, altrimenti IIS risponde con un errore di
   configurazione (500.19).
3. Configura un binding HTTPS con un certificato valido (es. da un'CA
   gratuita come Let's Encrypt tramite `win-acme` o `certbot`).
4. Copia il contenuto di `public/` (generato con `hugo --gc --minify`)
   nella cartella del sito IIS. Il file `web.config` è già incluso e
   verrà copiato insieme al resto.
5. Verifica gli header con `curl -I https://tuodominio` o su
   https://securityheaders.com (checklist `CLAUDE.md` §15).

## 4. Self-hosting su Linux con Nginx (alternativa)

Esempio di blocco `server` da adattare (percorso, dominio, certificati):

```nginx
server {
    listen 443 ssl http2;
    server_name tuodominio.it;

    root /var/www/scuola-danza/public;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/tuodominio.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tuodominio.it/privkey.pem;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    autoindex off;               # niente elenco cartelle (A05)
    server_tokens off;           # non esporre la versione di Nginx (A05)
}

server {
    listen 80;
    server_name tuodominio.it;
    return 301 https://$host$request_uri;   # forza HTTPS
}
```

## 5. CI: il workflow GitHub Actions

Il file `.github/workflows/deploy.yml` nella radice del progetto esegue,
ad ogni push su `main`:
1. una build di verifica (`hugo --gc --minify` deve completare senza
   errori);
2. una scansione dei segreti (`gitleaks`) sul repository;
3. la pubblicazione su GitHub Pages, solo se i due controlli precedenti
   sono andati a buon fine.

**Si attiva già da solo dal primo push**: a differenza di Woodpecker/
Codeberg, non serve alcuna iscrizione o abilitazione manuale su un sito
esterno — basta l'impostazione una tantum "Source: GitHub Actions" nelle
Settings → Pages del repository (vedi `docs/DEPLOYMENT-GITHUB.md` §A.3).

Se si preferisce non affidarsi alla CI, gli stessi due controlli si
possono comunque eseguire localmente prima di ogni commit:
```
hugo --gc --minify
gitleaks detect --source . --no-git -v
```

## 6. Checklist pre-deploy (adattata da `CLAUDE.md` §15)

- [ ] `baseURL` in `hugo.toml` aggiornato con il dominio reale definitivo
- [ ] `data/contatti.yaml` aggiornato con i contatti reali (non più
      segnaposto)
- [ ] Logo/favicon reali sostituiti in `static/img/` (vedi `README.md`)
- [ ] **Font "The Seasons" sostituito con una versione a licenza piena**
      (quello in `static/fonts/the-seasons.woff2` è una demo Fontspring,
      non licenziata per un sito pubblico, e copre solo l'ASCII base senza
      accenti — vedi commento in cima a `assets/css/main.css`)
- [ ] Build di produzione pulita: `hugo --gc --minify` senza errori/warning
- [ ] Solo la cartella `public/` viene pubblicata (mai i sorgenti) —
      con GitHub Actions questo è già garantito dal workflow, non serve
      farlo a mano
- [ ] HTTPS forzato con redirect da HTTP (automatico su GitHub Pages;
      vedi §3/§4 se invece si sceglie il self-hosting)
- [ ] Header di sicurezza verificati con https://securityheaders.com
- [ ] Nessun segreto nel repository (`gitleaks detect --source . --no-git`)
- [ ] Consapevoli che GitHub Pages non supporta header HTTP custom
      (vedi §2): il sito resta protetto solo dalla CSP via `<meta>` tag
