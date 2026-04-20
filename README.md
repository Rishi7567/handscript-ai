# HandScript AI

A web app that lets you digitize your own handwriting using AI. You provide handwriting samples, the app learns your style, and then you can type anything and it comes out looking like you actually wrote it by hand.

## What it does

- Write each letter on a canvas — the app walks you through uppercase, lowercase, and digits
- AI analyzes your strokes to build a model of your handwriting
- Type whatever you want, tweak settings (slant, size, spacing, ink weight), and see a live preview
- Export as PNG, PDF, or SVG
- Save multiple handwriting styles and switch between them

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand

**Backend:** Express.js, TypeScript, MongoDB, Passport.js (Google OAuth)

## Setup

```bash
git clone https://github.com/Rishi7567/handscript-ai.git
cd handscript-ai
npm install
cd client && npm install
cd ../server && npm install
```

Copy `server/.env.example` to `server/.env` and fill in your values, then:

```bash
npm run dev
```

## Handwriting generation performance

The Python handwriting service supports warmup and sampling controls:

- `CALLIGRAPHER_PRELOAD_MODE`: `off`, `async` (default), or `sync`
- `CALLIGRAPHER_STEP_MULTIPLIER`: generation step multiplier (default `20`, lower is faster)
- `CALLIGRAPHER_MIN_TSTEPS`: minimum sampling steps (default `220`)
- `CALLIGRAPHER_MAX_TSTEPS`: maximum sampling steps (default `1200`)

Using `async` preload keeps startup responsive while warming the model in background.

## License

MIT
