import { useMemo, useRef, useState } from 'react'
import './App.css'
import { formatJson, generateStore, toIdentifier } from './generate.ts'

const sampleJson = `{
  "user": {
    "id": 1,
    "name": "Amina",
    "active": true,
    "roles": ["admin", "editor"],
    "address": {
      "city": "Nairobi",
      "country": "KE"
    }
  },
  "theme": "dark",
  "notifications": 3,
  "cart": [
    { "id": "sku_1", "qty": 2, "price": 19.5 },
    { "id": "sku_2", "qty": 1, "price": 8 }
  ]
}`

function App() {
  const [json, setJson] = useState(sampleJson)
  const [storeName, setStoreName] = useState('app')
  const [readOnlyKeys, setReadOnlyKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const tree = useMemo(() => parseStateTree(json), [json])
  const result = useMemo(
    () => generateStore(json, storeName, readOnlyKeys),
    [json, storeName, readOnlyKeys],
  )
  const fileBase = `${toIdentifier(storeName || 'app')}Store`

  async function copyCode() {
    if (!result.ok) return
    try {
      await navigator.clipboard.writeText(result.code)
      setCopyError(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
      setCopyError(true)
    }
  }

  function downloadCode() {
    if (!result.ok) return
    const blob = new Blob([result.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileBase}.ts`
    link.click()
    URL.revokeObjectURL(url)
  }

  function prettyPrint() {
    try {
      setJson(formatJson(json))
    } catch {
      // Invalid JSON is already shown in the output pane.
    }
  }

  async function loadFile(file: File) {
    setJson(await file.text())
  }

  return (
    <>
      <section className="toolbar" aria-label="Generator settings">
        <label>
          Store name
          <input
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="app"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.txt"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void loadFile(file)
              event.target.value = ''
            }}
          />
          <button onClick={() => fileRef.current?.click()} type="button">
            Load JSON
          </button>
          <button onClick={prettyPrint} type="button">
            Format JSON
          </button>
          <button
            className="primary"
            disabled={!result.ok}
            onClick={copyCode}
            type="button"
          >
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button disabled={!result.ok} onClick={downloadCode} type="button">
            Download .ts
          </button>
        </div>
      </section>

      {copyError && (
        <p className="copy-error" role="status">
          Clipboard access was blocked. Select the generated code and copy it
          manually.
        </p>
      )}

      <section className="workspace">
        <label className="pane">
          <span>Input JSON</span>
          <textarea
            value={json}
            onChange={(event) => setJson(event.target.value)}
            spellCheck={false}
            aria-label="JSON input"
          />
        </label>

        <div className="pane output">
          <span>{result.ok ? `Generated ${fileBase}.ts` : 'Fix JSON'}</span>
          <pre>{result.ok ? result.code : result.error}</pre>
        </div>
      </section>

      <section className="state-tree" aria-labelledby="tree-title">
        <div className="tree-heading">
          <div>
            <h2 id="tree-title">State tree</h2>
            <p>
              Preview the inferred shape. Lock a top-level branch to remove its
              setter action.
            </p>
          </div>
          {tree && (
            <span className="tree-count">{tree.length} top-level fields</span>
          )}
        </div>
        {tree ? (
          <ul className="tree-list">
            {tree.map((node) => (
              <TreeNode
                key={node.name}
                node={node}
                isRoot
                readOnly={readOnlyKeys.has(node.name)}
                onToggle={() => {
                  setReadOnlyKeys((current) => {
                    const next = new Set(current)
                    if (next.has(node.name)) next.delete(node.name)
                    else next.add(node.name)
                    return next
                  })
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="tree-empty">
            Enter a valid JSON object or array to inspect its state shape.
          </p>
        )}
      </section>
    </>
  )
}

type StateNode = {
  name: string
  type: string
  children: StateNode[]
  omitted?: number
}

const MAX_TREE_CHILDREN = 20

function parseStateTree(source: string): StateNode[] | null {
  try {
    let value: unknown = JSON.parse(source)
    if (Array.isArray(value)) value = { items: value }
    if (!value || typeof value !== 'object') return null
    return Object.entries(value).map(([name, child]) => makeNode(name, child))
  } catch {
    return null
  }
}

function makeNode(name: string, value: unknown): StateNode {
  if (Array.isArray(value)) {
    const sample = value[0]
    const children =
      sample && typeof sample === 'object'
        ? Object.entries(sample)
            .slice(0, MAX_TREE_CHILDREN)
            .map(([key, child]) => makeNode(key, child))
        : []
    const omitted =
      sample && typeof sample === 'object'
        ? Math.max(0, Object.keys(sample).length - MAX_TREE_CHILDREN)
        : 0
    return { name, type: `array · ${value.length}`, children, omitted }
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    return {
      name,
      type: 'object',
      children: entries
        .slice(0, MAX_TREE_CHILDREN)
        .map(([key, child]) => makeNode(key, child)),
      omitted: Math.max(0, entries.length - MAX_TREE_CHILDREN),
    }
  }

  return { name, type: value === null ? 'null' : typeof value, children: [] }
}

function TreeNode({
  node,
  isRoot = false,
  readOnly = false,
  onToggle,
}: {
  node: StateNode
  isRoot?: boolean
  readOnly?: boolean
  onToggle?: () => void
}) {
  const title = (
    <>
      <span className="tree-name">{node.name}</span>
      <code className="tree-type">{node.type}</code>
    </>
  )
  const toggle = isRoot ? (
    <label className="tree-toggle">
      <input
        type="checkbox"
        checked={!readOnly}
        onChange={onToggle}
        aria-label={`${readOnly ? 'Make' : 'Mark'} ${node.name} ${readOnly ? 'editable' : 'read-only'}`}
      />
      <span>{readOnly ? 'Read-only' : 'Editable'}</span>
    </label>
  ) : null

  return (
    <li className="tree-node">
      {node.children.length > 0 ? (
        <details open={isRoot}>
          <summary>{title}</summary>
          {toggle}
          <ul className="tree-children">
            {node.children.map((child, index) => (
              <TreeNode key={`${child.name}-${index}`} node={child} />
            ))}
            {node.omitted ? (
              <li className="tree-more">+ {node.omitted} more fields</li>
            ) : null}
          </ul>
        </details>
      ) : (
        <div className="tree-leaf">{title}{toggle}</div>
      )}
    </li>
  )
}

export default App
