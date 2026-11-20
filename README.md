# JSON to Zustand converter

Paste JSON. Get TypeScript types and a ready-to-use Zustand store.

Free, no signup, and runs in your browser. Paste an example JSON object to get a TypeScript interface and Zustand store you can copy into your project.

## Features

- **Type inference from data** — arrays become unions (`[true, 'x', 5, null]` → `(boolean | string | number | null)[]`), nested objects are flattened into their own interfaces, and array keys singularize (`items` → `Item`).
- **Collision-safe naming** — a `TypeRegistry` dedupes anonymous object names (`Profile`, `Profile2`, …) so generated types never overwrite each other.
- **Top-level key sanitization** — top-level keys become valid `camelCase` store fields and action names. Nested payload keys keep their original API names, quoted when needed for valid TypeScript.
- **Null handling** — a standalone `null` maps to `unknown | null` so setters accept real values; when a nullable field appears across objects in an array, the parser unifies the schema across entries and emits `T | null` automatically.
- **State-tree preview** — inspect nested objects and arrays before copying. Lock a top-level branch to remove its setter action and generate a deeply `readonly` TypeScript type for that branch.
- **Private by design** — parsing and generation happen in the browser; JSON files are read locally and are not uploaded.

## How it works

The generator reads JSON in the browser and builds TypeScript types for its objects, arrays, and primitive values. It does not upload your input.

```bash
npm install
npm run dev
```

`npm run build` emits the static site into `dist/`. The included Wrangler
configuration serves those files as a Cloudflare Worker Static Assets site.
Cloudflare Workers Builds runs on every push and deploys that Worker. You can
also deploy by signing in with `npx wrangler login` and running
`npm run deploy:cloudflare`. See [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
and [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

Live: https://tool.fidelco.dev

Source: https://github.com/Polymerthcedric/json-zustand-generator

### Note on the live domain

The `tool.fidelco.dev` hostname currently serves a Vercel deployment. This
repository has no Vercel Git integration, so a push here updates the Cloudflare
Worker but does not update that hostname. To publish a change to the live site,
either redeploy the Vercel project or point `tool.fidelco.dev` at the Cloudflare
Worker. Until one of those happens, the live page may show older copy than this
repository.

## License

MIT — see [LICENSE](LICENSE).
