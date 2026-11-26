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

### Live domain deployments

The `tool.fidelco.dev` hostname currently serves a Vercel deployment, and the
Vercel project is connected to this GitHub repository for automatic deployments.
Vercel uses the project's configured production branch for live deployments;
other branch pushes can create preview deployments. The Cloudflare Worker is a
separate deployment target, so a repository change may deploy to both providers
without changing which one owns `tool.fidelco.dev`.

## License

MIT — see [LICENSE](LICENSE).
