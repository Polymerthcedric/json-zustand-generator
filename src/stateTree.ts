export type StateNode = {
  name: string
  type: string
  children: StateNode[]
  omitted?: number
  optional?: boolean
}

const MAX_TREE_CHILDREN = 20

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function valueType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isRecord(value)) return 'object'
  return typeof value
}

function makeObjectNode(
  name: string,
  records: JsonRecord[],
  expectedCount: number,
  optional = false,
): StateNode {
  const fields = new Map<string, unknown[]>()
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      const values = fields.get(key) ?? []
      values.push(value)
      fields.set(key, values)
    }
  }

  const entries = [...fields.entries()]
  return {
    name,
    type: 'object',
    children: entries
      .slice(0, MAX_TREE_CHILDREN)
      .map(([key, values]) => makeMergedNode(key, values, expectedCount)),
    omitted: Math.max(0, entries.length - MAX_TREE_CHILDREN),
    optional,
  }
}

function makeArrayNode(
  name: string,
  values: unknown[],
  optional = false,
): StateNode {
  const records = values.filter(isRecord)
  const shape = makeObjectNode(name, records, values.length)
  return {
    name,
    type: `array · ${values.length}`,
    children: records.length ? shape.children : [],
    omitted: records.length ? shape.omitted : 0,
    optional,
  }
}

function makeMergedNode(
  name: string,
  values: unknown[],
  expectedCount: number,
): StateNode {
  const optional = values.length < expectedCount
  const types = [...new Set(values.map(valueType))]
  if (values.every(isRecord)) {
    return makeObjectNode(name, values, values.length, optional)
  }
  if (values.every(Array.isArray)) {
    return makeArrayNode(name, values.flat(), optional)
  }

  const node = makeNode(name, values[0], optional)
  node.type = types.join(' | ')
  return node
}

function makeNode(name: string, value: unknown, optional = false): StateNode {
  if (Array.isArray(value)) return makeArrayNode(name, value, optional)
  if (isRecord(value)) return makeObjectNode(name, [value], 1, optional)
  return {
    name,
    type: valueType(value),
    children: [],
    optional,
  }
}

export function parseStateTree(source: string): StateNode[] | null {
  try {
    let value: unknown = JSON.parse(source)
    if (Array.isArray(value)) value = { items: value }
    if (!isRecord(value)) return null
    return Object.entries(value).map(([name, child]) => makeNode(name, child))
  } catch {
    return null
  }
}
