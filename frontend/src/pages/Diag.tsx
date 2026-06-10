import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

type CheckStatus = 'idle' | 'running' | 'ok' | 'warn' | 'error'

interface CheckResult {
  status: CheckStatus
  label: string
  detail?: string
  latency?: number
}

type Checks = Record<string, CheckResult>

const API_URL = (import.meta.env.VITE_API_URL as string ?? '').replace(/\/$/, '')
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const INITIAL: Checks = {
  fe_env:         { status: 'idle', label: 'Variables d\'environnement frontend' },
  fe_auth:        { status: 'idle', label: 'Session Supabase Auth' },
  be_health:      { status: 'idle', label: 'Backend — ping /health' },
  be_diag:        { status: 'idle', label: 'Backend — diagnostic complet' },
  db_connection:  { status: 'idle', label: 'Base de données — connexion' },
  api_auth:       { status: 'idle', label: 'API authentifiée — /notifications' },
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'idle')    return <Clock className="w-5 h-5 text-gray-300" />
  if (status === 'running') return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
  if (status === 'ok')      return <CheckCircle className="w-5 h-5 text-green-500" />
  if (status === 'warn')    return <AlertCircle className="w-5 h-5 text-amber-500" />
  return <XCircle className="w-5 h-5 text-red-500" />
}

function statusBg(status: CheckStatus) {
  if (status === 'ok')   return 'bg-green-50 border-green-200'
  if (status === 'warn') return 'bg-amber-50 border-amber-200'
  if (status === 'error') return 'bg-red-50 border-red-200'
  if (status === 'running') return 'bg-blue-50 border-blue-200'
  return 'bg-gray-50 border-gray-200'
}

function CheckCard({ check }: { check: CheckResult }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${statusBg(check.status)}`}>
      <div className="mt-0.5 shrink-0"><StatusIcon status={check.status} /></div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{check.label}</p>
        {check.detail && <p className="text-xs text-gray-500 mt-0.5 break-words">{check.detail}</p>}
        {check.latency !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">{check.latency} ms</p>
        )}
      </div>
    </div>
  )
}

interface DiagData {
  ok: boolean
  timestamp: string
  uptime: number
  nodeVersion: string
  env: Record<string, boolean>
  db: {
    ok: boolean
    latency: number
    error: string | null
    tables: Record<string, number> | null
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

export default function Diag() {
  const [checks, setChecks] = useState<Checks>(INITIAL)
  const [diagData, setDiagData] = useState<DiagData | null>(null)
  const [running, setRunning] = useState(false)

  function set(key: string, result: Partial<CheckResult>) {
    setChecks(prev => ({ ...prev, [key]: { ...prev[key], ...result } }))
  }

  const runChecks = useCallback(async () => {
    setRunning(true)
    setDiagData(null)
    // reset all to running
    setChecks(prev => {
      const next: Checks = {}
      for (const k of Object.keys(prev)) {
        next[k] = { ...prev[k], status: 'running', detail: undefined, latency: undefined }
      }
      return next
    })

    // 1. Frontend env vars
    const missingEnv: string[] = []
    if (!API_URL)          missingEnv.push('VITE_API_URL')
    if (!SUPABASE_URL)     missingEnv.push('VITE_SUPABASE_URL')
    if (!SUPABASE_ANON_KEY) missingEnv.push('VITE_SUPABASE_ANON_KEY')

    if (missingEnv.length === 0) {
      set('fe_env', { status: 'ok', detail: `API: ${API_URL}` })
    } else {
      set('fe_env', { status: 'error', detail: `Manquantes : ${missingEnv.join(', ')}` })
    }

    // 2. Supabase Auth session
    const authCheck = supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        set('fe_auth', { status: 'error', detail: error.message })
      } else if (!data.session) {
        set('fe_auth', { status: 'warn', detail: 'Aucune session active (non connecté ?)' })
      } else {
        const exp = new Date(data.session.expires_at! * 1000)
        set('fe_auth', { status: 'ok', detail: `Connecté · expire ${exp.toLocaleString('fr-FR')}` })
      }
    }).catch((err: unknown) => {
      set('fe_auth', { status: 'error', detail: err instanceof Error ? err.message : 'Erreur' })
    })

    // 3. Backend health
    const healthCheck = (async () => {
      const t0 = Date.now()
      try {
        const r = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) })
        const latency = Date.now() - t0
        if (r.ok) {
          set('be_health', { status: 'ok', detail: `HTTP ${r.status}`, latency })
        } else {
          set('be_health', { status: 'error', detail: `HTTP ${r.status}`, latency })
        }
      } catch (err) {
        set('be_health', { status: 'error', detail: err instanceof Error ? err.message : 'Inaccessible', latency: Date.now() - t0 })
      }
    })()

    // 4. Backend diag (includes DB)
    const diagCheck = (async () => {
      const t0 = Date.now()
      try {
        const r = await fetch(`${API_URL}/diag`, { signal: AbortSignal.timeout(10000) })
        const latency = Date.now() - t0
        const data: DiagData = await r.json()
        setDiagData(data)

        // backend env
        const missingBeEnv = Object.entries(data.env).filter(([, v]) => !v).map(([k]) => k)
        const uptime = `Node ${data.nodeVersion} · uptime ${Math.floor(data.uptime / 60)}min`
        if (!r.ok) {
          set('be_diag', { status: 'error', detail: `HTTP ${r.status}`, latency })
        } else if (missingBeEnv.length > 0) {
          set('be_diag', { status: 'warn', detail: `Var. manquantes: ${missingBeEnv.join(', ')} · ${uptime}`, latency })
        } else {
          set('be_diag', { status: 'ok', detail: uptime, latency })
        }

        // DB
        if (data.db.ok) {
          set('db_connection', { status: 'ok', detail: `${Object.keys(data.db.tables ?? {}).length} tables`, latency: data.db.latency })
        } else {
          set('db_connection', { status: 'error', detail: data.db.error ?? 'Connexion échouée' })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Inaccessible'
        set('be_diag', { status: 'error', detail: msg, latency: Date.now() - t0 })
        set('db_connection', { status: 'error', detail: 'Backend inaccessible' })
      }
    })()

    // 5. Authenticated API call
    const apiAuthCheck = (async () => {
      const t0 = Date.now()
      try {
        const { data: sess } = await supabase.auth.getSession()
        const token = sess.session?.access_token
        if (!token) {
          set('api_auth', { status: 'warn', detail: 'Pas de token — connexion requise' })
          return
        }
        const r = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        })
        const latency = Date.now() - t0
        if (r.ok) {
          const body = await r.json()
          const count = body?.notifications?.length ?? '?'
          set('api_auth', { status: 'ok', detail: `${count} notification(s)`, latency })
        } else {
          set('api_auth', { status: 'error', detail: `HTTP ${r.status}`, latency })
        }
      } catch (err) {
        set('api_auth', { status: 'error', detail: err instanceof Error ? err.message : 'Erreur', latency: Date.now() - t0 })
      }
    })()

    await Promise.allSettled([authCheck, healthCheck, diagCheck, apiAuthCheck])
    setRunning(false)
  }, [])

  const allDone = Object.values(checks).every(c => c.status !== 'running' && c.status !== 'idle')
  const errCount = Object.values(checks).filter(c => c.status === 'error').length
  const warnCount = Object.values(checks).filter(c => c.status === 'warn').length
  const okCount = Object.values(checks).filter(c => c.status === 'ok').length
  const total = Object.keys(checks).length

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic</h1>
          {allDone && (
            <p className="text-sm text-gray-500 mt-0.5">
              {okCount}/{total} OK
              {warnCount > 0 && ` · ${warnCount} avertissement${warnCount > 1 ? 's' : ''}`}
              {errCount > 0 && ` · ${errCount} erreur${errCount > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <button
          onClick={runChecks}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'En cours…' : allDone ? 'Relancer' : 'Lancer les tests'}
        </button>
      </div>

      <Section title="Frontend">
        <CheckCard check={checks.fe_env} />
        <CheckCard check={checks.fe_auth} />
      </Section>

      <Section title="Backend">
        <CheckCard check={checks.be_health} />
        <CheckCard check={checks.be_diag} />
        {diagData && (
          <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-500 space-y-1">
            <div className="font-semibold text-gray-600 mb-1">Variables d'env backend</div>
            {Object.entries(diagData.env).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className={v ? 'text-green-600' : 'text-red-600'}>{v ? '✓ présente' : '✗ absente'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Base de données">
        <CheckCard check={checks.db_connection} />
        {diagData?.db.ok && diagData.db.tables && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Table</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Enregistrements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(diagData.db.tables).map(([name, count]) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-700">{name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="API authentifiée">
        <CheckCard check={checks.api_auth} />
      </Section>

      {!allDone && !running && (
        <p className="text-sm text-gray-400 text-center mt-4">
          Cliquez sur "Lancer les tests" pour diagnostiquer l'application.
        </p>
      )}
    </div>
  )
}
