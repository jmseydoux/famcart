import { useEffect, useState } from 'react'

type TableStat = {
  name: string
  count: number
}

type StatusData = {
  tables: TableStat[]
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: StatusData }

export default function DbStatus() {
  const [state, setState] = useState<FetchState>({ status: 'loading' })
  const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  useEffect(() => {
    fetch(`${apiUrl}/status`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StatusData>
      })
      .then((data) => setState({ status: 'success', data }))
      .catch((err: unknown) =>
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Erreur inconnue' })
      )
  }, [])

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Status de la base de données</h1>

      {state.status === 'loading' && (
        <p className="text-gray-500">Connexion à la base de données…</p>
      )}

      {state.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Impossible de joindre le backend</p>
          <p className="text-sm mt-1">{state.message}</p>
          <p className="text-xs mt-2 text-red-500 font-mono">{apiUrl}</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <p className="text-xs text-gray-400 font-mono px-6 py-2 border-b border-gray-100">{apiUrl}</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Table</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Enregistrements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.data.tables.map((t) => (
                <tr key={t.name} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-gray-800">{t.name}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
