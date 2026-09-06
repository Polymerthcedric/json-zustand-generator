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
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => generateStore(json, storeName), [json, storeName])
  const fileBase = `${toIdentifier(storeName || 'app')}Store`

  async function copyCode() {
    if (!result.ok) return
    await navigator.clipboard.writeText(result.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
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
    <main className="page">
      <p className="banner">
        Tired of writing boilerplate by hand? A production-ready Next.js
        DevSecOps starter is coming — this tool stays free, with no signup.
      </p>

      <section className="hero">
        <p className="eyebrow">JSON to Zustand converter</p>
        <h1>Generate a Zustand store from JSON</h1>
        <p className="lede">
          Paste JSON on the left. Get TypeScript types and a ready-to-use
          Zustand store on the right. Runs in your browser.
        </p>
      </section>

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
    </main>
  )
}

export default App
