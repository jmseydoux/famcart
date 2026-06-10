import { Response } from 'express'
import { Router } from 'express'
import { AuthRequest } from '../middleware/auth'
import { APP_VERSION } from '../lib/version'

const router = Router()

const GITHUB_REPO = 'jmseydoux/famcart'

const TYPE_LABELS: Record<string, string> = {
  bug:         'bug',
  enhancement: 'enhancement',
  question:    'question',
}

const TYPE_EMOJIS: Record<string, string> = {
  bug:         '🐛',
  enhancement: '✨',
  question:    '❓',
}

router.post('/', async (req: AuthRequest, res: Response) => {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    res.status(503).json({ error: 'GitHub token non configuré sur le serveur.' })
    return
  }

  const { title, body, type, page, userAgent } = req.body as {
    title?: string; body?: string; type?: string; page?: string; userAgent?: string
  }
  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'Titre et description requis.' })
    return
  }

  const issueType = TYPE_LABELS[type ?? ''] ? (type as string) : 'question'
  const emoji = TYPE_EMOJIS[issueType]

  const userName = req.user?.name ?? 'Inconnu'
  const userEmail = req.user?.email ?? ''

  const issueTitle = `${emoji} ${title.trim()}`
  const issueBody = [
    `**Type :** ${issueType}`,
    `**Signalé par :** ${userName}${userEmail ? ` (${userEmail})` : ''}`,
    `**Version :** v${APP_VERSION}`,
    `**Page :** \`${page ?? 'inconnue'}\``,
    `**Navigateur :** ${userAgent ?? 'inconnu'}`,
    `**Date :** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    '',
    '---',
    '',
    body.trim(),
  ].join('\n')

  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [TYPE_LABELS[issueType]],
      }),
    })

    if (!r.ok) {
      const detail = await r.json().catch(() => ({}))
      res.status(502).json({ error: 'Erreur GitHub API', detail })
      return
    }

    const issue = await r.json() as { number: number; html_url: string }
    res.json({ number: issue.number, url: issue.html_url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
