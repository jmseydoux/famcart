import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../lib/version'

type Status = 'loading' | 'ok' | 'error'

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function StatusBadge({ status }: { status: Status }) {
  if (status === 'loading') return <span className="text-xs text-gray-400">…</span>
  if (status === 'ok') return <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">OK</span>
  return <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Erreur</span>
}

function Panel({ title, status, children }: { title: string; status: Status; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <StatusBadge status={status} />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-mono text-xs bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded max-w-[60%] truncate">{value}</span>
    </div>
  )
}

export default function Home() {
  const { session, appUser } = useAuth()

  const [backendStatus, setBackendStatus] = useState<Status>('loading')
  const [backendLatency, setBackendLatency] = useState<number | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)

  const [dbStatus, setDbStatus] = useState<Status>('loading')
  const [dbTableCount, setDbTableCount] = useState<number | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)

  const checkBackend = useCallback(async () => {
    setBackendStatus('loading')
    setBackendLatency(null)
    setBackendError(null)
    const start = performance.now()
    try {
      const r = await fetch(`${apiUrl}/health`)
      const latency = Math.round(performance.now() - start)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setBackendLatency(latency)
      setBackendStatus('ok')
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Erreur réseau')
      setBackendStatus('error')
    }
  }, [])

  const checkDb = useCallback(async () => {
    setDbStatus('loading')
    setDbTableCount(null)
    setDbError(null)
    try {
      const r = await fetch(`${apiUrl}/status`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setDbTableCount(data.tables?.length ?? 0)
      setDbStatus('ok')
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Erreur réseau')
      setDbStatus('error')
    }
  }, [])

  useEffect(() => {
    checkBackend()
    checkDb()
  }, [checkBackend, checkDb])

  const provider = session?.user?.app_metadata?.provider ?? 'email'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-0.5">État des composants de l'infrastructure</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Panel title="Authentification" status="ok">
          <Row label="Utilisateur" value={appUser?.name ?? session?.user?.email ?? '—'} />
          <Row label="Email" value={appUser?.email ?? session?.user?.email ?? '—'} />
          <Row label="Provider" value={provider} />
          <Row label="Session" value="active" />
        </Panel>

        <Panel title="Backend" status={backendStatus}>
          <Row label="URL" value={apiUrl} />
          {backendStatus === 'ok' && backendLatency !== null && (
            <Row label="Latence" value={`${backendLatency} ms`} />
          )}
          {backendStatus === 'error' && backendError && (
            <p className="text-xs text-red-600">{backendError}</p>
          )}
          <button onClick={checkBackend} className="text-xs text-blue-600 hover:underline">
            Tester à nouveau
          </button>
        </Panel>

        <Panel title="Base de données" status={dbStatus}>
          {dbStatus === 'ok' && dbTableCount !== null && (
            <Row label="Tables" value={`${dbTableCount}`} />
          )}
          {dbStatus === 'error' && dbError && (
            <p className="text-xs text-red-600">{dbError}</p>
          )}
          <div className="flex gap-3">
            <button onClick={checkDb} className="text-xs text-blue-600 hover:underline">
              Tester à nouveau
            </button>
            <Link to="/db-status" className="text-xs text-blue-600 hover:underline">
              Détails →
            </Link>
          </div>
        </Panel>

        <Panel title="Frontend" status="ok">
          <Row label="Version" value={APP_VERSION} />
          <Row label="Environnement" value={import.meta.env.MODE} />
          <Row label="API" value={apiUrl} />
          <Row label="Stack" value="React 18 + Vite + TypeScript" />
        </Panel>
      </div>
    </div>
  )
}
