# InsecureShield Claims Portal

A small Express + static-HTML demo web application designed to be **intentionally insecure** — every secret in this repository is fake but pattern-valid, so secret-detection tools fire on them as if they were real production credentials.

> ## ⚠️ All credentials in this repository are synthetic test data
>
> The values that look like AWS keys, Stripe live secrets, Azure AD client secrets, SQL passwords, JWT secrets, and so on are **not real**. They are pattern-shaped placeholders. None of them authenticate to any real service.
>
> Each credential class was independently auth-tested before publishing — every value returns `401 Unauthorized` / `400 Invalid` / `InvalidClientTokenId` against its real provider.
>
> This repository is intended **only** for evaluating secret-detection tooling. Do not redeploy these values anywhere expecting them to work, and do not file vulnerability reports for them — they are exposed by design.

---

## What this is

A static-HTML + Express front-end that mimics a typical webpacked single-page application: an `index.html`, a `dashboard.html`, a sitemap, a config JSON, and a handful of JS bundles (`env.js`, `firebase.js`, `apim-auth.js`, `main.js`, `app.js`) that contain credentials in places where real-world client-side bundles often leak them — environment files, Firebase init blocks, APIM bootstrapping, build manifests, sitemap comments, and so on.

The credentials cover a deliberate spread of categories so that different scanners exercise different parts of their detection pipeline:

- Anchored vendor formats (AWS, Stripe, SendGrid, Google, Twilio, Mailgun)
- Azure AD `client_secret`, APIM subscription key, App Insights iKey
- JWT signing secret, webhook signing secret
- Plaintext database password and SQL Server connection string
- A CryptoJS-AES `U2FsdGVkX1` encrypted-configuration blob
- Custom-named credential keys (`appKey`, `resourceKey`)
- HTML comment leaks, sitemap comment leaks, asset-manifest leaks

## Running it locally

Requires Node 18+ and npm.

```sh
git clone https://github.com/secretsifter/insecureshield-demo.git
cd insecureshield-demo
npm install
npm start
```

The portal listens on `http://localhost:3000`. Point your secret-detection tool of choice at it.

## What to try

Run any combination of the following against the local instance and compare what each catches:

- A passive scanner that watches Burp's HTTP history
- A binary-wrapping scanner with live verification
- An active discovery scanner that follows `<script src>` and webpack chunks
- An LLM-driven scanner fed the raw bundles
- A SAST tool pointed at the static assets

Different categories of tooling will surface different subsets of the embedded credentials. The intent of the demo is to make those differences visible on a controlled, reproducible target — *not* to publish a leaderboard.

## Repository layout

```
insecureshield-demo/
├── server.js              Express server, hardcoded secrets, JWT issuer
├── package.json
├── public/
│   ├── index.html         Login page (HTML-comment leaks at top)
│   ├── dashboard.html     Authenticated landing page
│   ├── sitemap.xml        Sitemap with comment-leaked internal endpoints
│   ├── asset-manifest.json
│   ├── config.json        Azure AD config, APIM, storage, Redis URL
│   ├── css/style.css
│   └── js/
│       ├── env.js         Runtime environment with embedded vendor keys
│       ├── firebase.js    Firebase init + service-account stub
│       ├── apim-auth.js   APIM token bootstrap (key in request header)
│       ├── main.js        Service-discovery configuration
│       └── app.js         Frontend logic
└── data/
    └── db.js              Seed customer + claim data
```

## Reporting issues

See [SECURITY.md](SECURITY.md) for the policy on credential reports and other security concerns.

## License

MIT. See [LICENSE](LICENSE).
