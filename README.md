# The Daily Digest. — Tech Newspaper

A browser-based newspaper frontend that consumes the [hndaily-digest](https://github.com/bnbcast/hndaily-digest) daily Hacker News digest plus 5 niche tech sources, laid out in a classic multi-column newspaper format.

## Sources

| Source | Niche |
|--------|-------|
| Hacker News (via hndaily-digest) | Tech / startups |
| Lobste.rs | Computing |
| Ars Technica | Technology deep-dive |
| Hackaday | Hardware / hacking |
| Dev.to | Developer community |
| Stack Overflow Blog | Software engineering |

## How it works

- Fetches the latest available digest markdown from `bnbcast/hndaily-digest` (GitHub raw)
- Pulls RSS feeds from the 5 niche sources (via a CORS proxy)
- Renders all stories in a 3-column newspaper layout with masthead, issue bar, and section headers
- Print-ready CSS for physical newspaper output

## Run locally

```sh
npm install
npm run dev
npm run build
```

## Deploy

GitHub Pages via GitHub Actions (see `.github/workflows/deploy-pages.yml`).
