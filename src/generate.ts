const reserved = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'any',
  'boolean',
  'constructor',
  'declare',
  'get',
  'module',
  'require',
  'number',
  'set',
  'string',
  'symbol',
  'type',
  'from',
  'of',
  'undefined',
  'never',
  'unknown',
  'bigint',
  'object',
  'record',
  'await',
  'async',
  'namespace',
  'keyof',
  'infer',
  'is',
  'asserts',
  'unique',
  'readonly',
  'abstract',
  'override',
  'accessor',
  'satisfies',
])

type JsonObject = Record<string, unknown>

type Field = {
  key: string
  optional: boolean
  type: string
}

class TypeRegistry {
  private used = new Set<string>()
  readonly interfaces: string[] = []

  take(preferred: string) {
    let base = toTypeName(preferred)
    if (reserved.has(base.toLowerCase())) base += 'Type'

    let name = base
    let n = 2
    while (this.used.has(name)) {
      name = `${base}${n++}`
    }

    this.used.add(name)
    return name
  }

  addInterface(name: string, fields: Field[]) {
    const body =
      fields.length === 0
        ? `export interface ${name} {}`
        : `export interface ${name} {\n${fields
            .map(
              (field) =>
                `  ${safeKey(field.key)}${field.optional ? '?' : ''}: ${field.type}`,
            )
            .join('\n')}\n}`

    this.interfaces.push(body)
  }
}

export type GenerateResult =
  | { ok: true; code: string }
  | { ok: false; error: string }

export function generateStore(source: string, rawName: string): GenerateResult {
  try {
    let parsed: unknown = JSON.parse(source)

    if (Array.isArray(parsed)) {
      parsed = { items: parsed }
    }

    if (!isObject(parsed)) {
      return { ok: false, error: 'Top-level JSON must be an object or array.' }
    }

    const name = toIdentifier(rawName || 'app')
    const pascal = capitalize(name)
    const registry = new TypeRegistry()
    const stateName = registry.take(`${pascal}State`)
    const storeType = `${pascal}Store`
    const hookName = `use${pascal}Store`

    const fields = inferFields(parsed, registry)

    const usedIdents = new Set<string>()
    const keyed = fields.map((field) => {
      let ident = toIdentifier(field.key) || 'value'
      let candidate = ident
      let n = 2
      while (usedIdents.has(candidate)) candidate = `${ident}${n++}`
      usedIdents.add(candidate)

      return { ...field, raw: field.key, key: candidate, ident: candidate }
    })

    registry.addInterface(
      stateName,
      keyed.map(({ key, optional, type }) => ({ key, optional, type })),
    )
    const actionsName = registry.take(`${pascal}Actions`)

    const remapped: Record<string, unknown> = {}
    for (const setter of keyed) remapped[setter.key] = parsed[setter.raw]

    const initial = JSON.stringify(remapped, null, 2)
    const types = registry.interfaces.join('\n\n')
    const actionBlock = [
      ...keyed.map(
        (setter) =>
          `  set${capitalize(setter.ident)}: (${setter.ident}: ${setter.type}) => void`,
      ),
      '  reset: () => void',
    ].join('\n')
    const implBlock = keyed
      .map((setter) => {
        const assignment = `set({ ${setter.key}: ${setter.ident} })`
        return `  set${capitalize(setter.ident)}: (${setter.ident}) => ${assignment},`
      })
      .join('\n')

    return {
      ok: true,
      code: `import { create } from 'zustand'

${types}

export interface ${actionsName} {
${actionBlock}
}

export type ${storeType} = ${stateName} & ${actionsName}

const initialState: ${stateName} = ${initial}

export const ${hookName} = create<${storeType}>()((set) => ({
  ...initialState,
${implBlock}
  reset: () => set(initialState),
}))
`,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    }
  }
}

export function formatJson(source: string) {
  return JSON.stringify(JSON.parse(source), null, 2)
}

export function toIdentifier(value: string) {
  const tokens = value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const words: string[] = []
  for (const token of tokens) {
    const parts =
      token.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g) ?? [token]
    words.push(...parts)
  }

  const cleaned = words
    .map((word, index) => {
      const normalized = word === word.toUpperCase() ? word.toLowerCase() : word
      if (index === 0) return normalized.toLowerCase()
      return capitalize(normalized)
    })
    .join('')

  if (!cleaned) return 'app'
  if (/^[0-9]/.test(cleaned) || reserved.has(cleaned)) return `app${capitalize(cleaned)}`
  return cleaned
}

function inferFields(value: JsonObject, registry: TypeRegistry): Field[] {
  return Object.entries(value).map(([key, child]) => ({
    key,
    optional: false,
    type: inferType(child, nameFromKey(key, Array.isArray(child)), registry),
  }))
}

function inferObject(value: JsonObject, name: string, registry: TypeRegistry) {
  const typeName = registry.take(name)
  registry.addInterface(typeName, inferFields(value, registry))
  return typeName
}

function inferMergedObject(values: JsonObject[], name: string, registry: TypeRegistry) {
  const seen = new Map<string, { values: unknown[]; count: number }>()

  for (const value of values) {
    for (const [key, child] of Object.entries(value)) {
      const entry = seen.get(key) ?? { values: [], count: 0 }
      entry.values.push(child)
      entry.count += 1
      seen.set(key, entry)
    }
  }

  const typeName = registry.take(name)
  const fields = [...seen.entries()].map(([key, entry]) => ({
    key,
    optional: entry.count < values.length,
    type: inferUnion(
      entry.values,
      nameFromKey(key, entry.values.some(Array.isArray)),
      registry,
    ),
  }))

  registry.addInterface(typeName, fields)
  return typeName
}

function inferType(value: unknown, preferredName: string, registry: TypeRegistry): string {
  if (value === null) return 'unknown | null'
  if (Array.isArray(value)) return inferArray(value, preferredName, registry)
  if (isObject(value)) return inferObject(value, preferredName, registry)
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'unknown'
}

function inferArray(values: unknown[], preferredName: string, registry: TypeRegistry) {
  if (values.length === 0) return 'unknown[]'
  const element = inferUnion(values, preferredName, registry)
  return element.includes('|') ? `(${element})[]` : `${element}[]`
}

function inferUnion(values: unknown[], preferredName: string, registry: TypeRegistry) {
  const objects = values.filter(isObject)
  const rest = values.filter((value) => !isObject(value))
  const parts: string[] = []

  if (objects.length > 0) {
    parts.push(inferMergedObject(objects, preferredName, registry))
  }

  for (const value of rest) {
    if (value === null) {
      parts.push('null')
    } else if (Array.isArray(value)) {
      parts.push(inferArray(value, `${preferredName}Item`, registry))
    } else {
      parts.push(inferType(value, preferredName, registry))
    }
  }

  return unique(parts).join(' | ')
}

function nameFromKey(key: string, array: boolean) {
  const ident = toIdentifier(key)
  const pascal = capitalize(ident)

  if (!array) return pascal

  const singular = singularize(ident)
  if (singular !== ident) return capitalize(singular)
  return `${pascal}Item`
}

function singularize(value: string) {
  if (value.endsWith('ies') && value.length > 3) return `${value.slice(0, -3)}y`
  if (value.endsWith('ses') && value.length > 3) return value.slice(0, -2)
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 1) {
    return value.slice(0, -1)
  }
  return value
}

function toTypeName(value: string) {
  const name = value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join('')

  if (!name) return 'Model'
  if (/^[0-9]/.test(name)) return `Model${name}`
  return name
}

function safeKey(key: string) {
  return /^[$A-Z_a-z][$\w]*$/.test(key) && !reserved.has(key) ? key : JSON.stringify(key)
}

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
