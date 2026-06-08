import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Register() {
  const { signUp, session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [token, setToken] = useState(params.get('token') ?? '')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [tokenInfo, setTokenInfo] = useState<{ max_households: number; max_members: number } | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (token.length === 36) validateToken(token)
  }, [])

  async function validateToken(t: string) {
    setValidating(true)
    setTokenValid(null)
    setError('')
    try {
      const data = await api.get<{ valid: boolean; max_households: number; max_members: number }>(
        `/auth/invitation/${t}`
      )
      setTokenValid(true)
      setTokenInfo({ max_households: data.max_households, max_members: data.max_members })
    } catch (err) {
      setTokenValid(false)
      setError(err instanceof Error ? err.message : 'Invitation invalide')
    } finally {
      setValidating(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tokenValid) { setError('Veuillez valider votre token d\'invitation'); return }
    if (password.length < 8) { setError('Mot de passe minimum 8 caractères'); return }
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, name, token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🛒 FamCart</h1>
          <p className="text-gray-500 mt-2">Créer un compte</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Inscription par invitation</h2>

          {/* Token validation */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token d'invitation
            </label>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={validating}
                onClick={() => validateToken(token)}
                disabled={token.length < 10}
              >
                Vérifier
              </Button>
            </div>
            {tokenValid === true && tokenInfo && (
              <p className="mt-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                ✓ Invitation valide — jusqu'à {tokenInfo.max_households} ménage(s), {tokenInfo.max_members} membres
              </p>
            )}
            {tokenValid === false && (
              <p className="mt-1.5 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{error}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Prénom et nom"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Marie Dupont"
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="minimum 8 caractères"
              autoComplete="new-password"
              minLength={8}
            />

            {error && tokenValid !== false && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!tokenValid}
              className="w-full"
              size="lg"
            >
              Créer mon compte
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
