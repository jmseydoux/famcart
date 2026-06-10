import { useState } from 'react'
import { MessageSquarePlus, X, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type IssueType = 'bug' | 'enhancement' | 'question'

const TYPE_LABELS: Record<IssueType, string> = {
  bug:         '🐛 Bug',
  enhancement: '✨ Amélioration',
  question:    '❓ Question',
}

interface FeedbackResponse {
  number: number
  url: string
}

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<IssueType>('enhancement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<FeedbackResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  function reset() {
    setType('enhancement')
    setTitle('')
    setBody('')
    setState('idle')
    setResult(null)
    setErrorMsg('')
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const data = await api.post<FeedbackResponse>('/feedback', { title, body, type })
      setResult(data)
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
      setState('error')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="Envoyer un retour"
        title="Signaler un problème ou suggérer une amélioration"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Envoyer un retour</h2>
              <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {state === 'success' && result ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium mb-1">Issue créée avec succès !</p>
                <p className="text-sm text-gray-500 mb-4">Issue #{result.number} sur GitHub</p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 text-sm hover:underline"
                >
                  Voir sur GitHub <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={handleClose}
                  className="block mx-auto mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {(Object.keys(TYPE_LABELS) as IssueType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                          type === t
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Résumé en quelques mots"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                  <textarea
                    required
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={4}
                    placeholder="Décris le problème ou la suggestion en détail…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                </div>

                {state === 'error' && (
                  <p className="text-xs text-red-600">{errorMsg}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {state === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {state === 'loading' ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
