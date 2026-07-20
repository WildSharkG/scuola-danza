# Deployment — A un passo dal sogno

> Versione: 1.0
> Data ultima revisione: 2026-07-20

**Nota sul nome del file**: `CLAUDE.md` §16 prevede un file chiamato
`docs/DEPLOYMENT-WINDOWS.md`, presupponendo un deployment su Windows
Server on-premises. Per questo progetto l'hosting finale **non è ancora
stato deciso** (era già stato segnalato come punto aperto durante la
progettazione: Codeberg Pages, Netlify o un self-hosting Windows/IIS sono
tutte opzioni plausibili). Fissare fin da ora un solo scenario
sarebbe fuorviante. Questo documento copre quindi tutte le opzioni
plausibili, con una sezione dedicata a Windows/IIS che risponde
comunque all'esigenza originale del nome del file. Una volta scelto
l'hosting definitivo, si può rinominare/restringere questo documento.

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
| Codeberg Pages | **No** | Serve solo file statici, non permette header custom. Serve un CDN/proxy davanti (es. Cloudflare in modalità proxy) se si vogliono gli header completi |
| GitHub Pages | **No** | Stessa limitazione di Codeberg Pages |
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

## 5. CI: attivare la pipeline Woodpecker su Codeberg

Il file `.woodpecker.yml` nella radice del progetto esegue, ad ogni
push:
1. una build di verifica (`hugo --gc --minify` deve completare senza
   errori);
2. una scansione dei segreti (`gitleaks`) sul repository.

**Non si attiva da sola.** Passi una tantum:
1. Vai su https://ci.codeberg.org e accedi con l'account Codeberg.
2. Abilita il repository dalla lista.
3. Da quel momento ogni push esegue automaticamente la pipeline.

Se non si vuole usare Woodpecker, i due controlli si possono comunque
eseguire localmente prima di ogni commit:
```
hugo --gc --minify
gitleaks detect --source . --no-git -v
```

## 6. Checklist pre-deploy (adattata da `CLAUDE.md` §15)

- [ ] `baseURL` in `hugo.toml` aggiornato con il dominio reale definitivo
- [ ] `data/contatti.yaml` aggiornato con i contatti reali (non più
      segnaposto)
- [ ] Logo/favicon reali sostituiti in `static/img/` (vedi `README.md`)
- [ ] Build di produzione pulita: `hugo --gc --minify` senza errori/warning
- [ ] Solo la cartella `public/` viene pubblicata (mai i sorgenti)
- [ ] HTTPS forzato con redirect da HTTP (vedi §3/§4 secondo l'host)
- [ ] Header di sicurezza verificati con https://securityheaders.com
- [ ] Nessun segreto nel repository (`gitleaks detect --source . --no-git`)
- [ ] Se si adotta un host che non supporta header custom (Codeberg
      Pages/GitHub Pages): valutato consapevolmente il trade-off (vedi §2)
