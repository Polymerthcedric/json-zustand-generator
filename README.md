# JSON to Zustand converter

Paste JSON. Get TypeScript types and a ready-to-use Zustand store.

Free, no signup, runs entirely in the browser. Built as a zero-backend search tool: developers looking for `json to zustand converter` or `generate zustand store from JSON` can use it immediately.

## Features

- **Type inference from data** — arrays become unions (`[true, 'x', 5, null]` → `(boolean | string | number | null)[]`), nested objects are flattened into their own interfaces, and array keys singularize (`items` → `Item`).
- **Collision-safe naming** — a `TypeRegistry` dedupes anonymous object names (`Profile`, `Profile2`, …) so generated types never overwrite each other.
- **Universal key sanitization** — `MAX_CONNECTIONS_ALLOWED`, `api_version_id`, and `auth/provider/endpoint` become valid `camelCase` in the state shape, initial state, and action setters.
- **Null handling** — a standalone `null` maps to `unknown | null` so setters accept real values; when a nullable field appears across objects in an array, the parser unifies the schema across entries and emits `T | null` automatically.

## How it works

The generator parses JSON client-side and walks the resulting object graph: primitive values map to `boolean`/`number`/`string`, arrays route through a union-inference pass, and nested objects are claimed through a name registry. No server, no upload — your JSON never leaves the browser; the store compiles under `tsc --strict`.

```bash
npm install
npm run dev
```

`npm run build` emits a static site you can drop on Cloudflare Pages or any other free static host.

Live: https://tool.fidelco.dev
