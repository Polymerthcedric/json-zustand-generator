# JSON to Zustand converter

Paste JSON. Get TypeScript types and a ready-to-use Zustand store.

Free, no signup, runs entirely in the browser. Built as a zero-backend search tool: developers looking for `json to zustand converter` or `generate zustand store from JSON` can use it immediately.

## Features

- **Type inference from data** — arrays become unions (`[true, 'x', 5, null]` → `(boolean | string | number | null)[]`), nested objects are flattened into their own interfaces, and array keys singularize (`items` → `Item`).
- **Collision-safe naming** — a `TypeRegistry` dedupes anonymous object names (`Profile`, `Profile2`, …) so generated types never overwrite each other.
- **Top-level key sanitization** — top-level keys become valid `camelCase` store fields and action names. Nested payload keys keep their original API names, quoted when needed for valid TypeScript.
- **Null handling** — a standalone `null` maps to `unknown | null` so setters accept real values; when a nullable field appears across objects in an array, the parser unifies the schema across entries and emits `T | null` automatically.
- **State-tree preview** — inspect nested objects and arrays before copying. Lock a top-level branch to remove its setter action and generate a deeply `readonly` TypeScript type for that branch.
- **Private by design** — parsing and generation happen in the browser; JSON files are read locally and are not uploaded.

## How it works

The generator parses JSON client-side and walks the resulting object graph: primitive values map to `boolean`/`number`/`string`, arrays route through a union-inference pass, and nested objects are claimed through a name registry. No server, no upload — your JSON never leaves the browser; the store compiles under `tsc --strict`.

```bash
npm install
npm run dev
```

`npm run build` emits a static site you can drop on Cloudflare Pages or any other free static host.

Live: https://tool.fidelco.dev
