# ACS — Agent Control System website

Institutional single-page website built with Vite, React and TypeScript.

The public product is positioned as **ACS — Agent Control System**. The site also presents the broader ACS Core coordination architecture as an explicit in-development direction, without implying that unfinished capabilities are currently available.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vite generates the static site in `dist/`.

## Vercel

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

The included `vercel.json` provides the SPA fallback.

## External links

Copy `.env.example` to `.env` and customize:

- `VITE_ACS_APP_URL`
- `VITE_ACS_GITHUB_URL`
- `VITE_ACS_DOCS_URL`

No environment value is required to build the site.
