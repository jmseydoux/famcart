import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import statusRouter from './routes/status'
import diagRouter from './routes/diag'
import authRouter from './routes/auth'
import adminRouter from './routes/admin'
import householdsRouter from './routes/households'
import productsRouter from './routes/products'
import listsRouter from './routes/lists'
import sessionsRouter from './routes/sessions'
import notificationsRouter from './routes/notifications'
import { requireAuth, requireSuperAdmin, requireHouseholdAccess } from './middleware/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })
app.use('/status', statusRouter)
app.use('/diag', diagRouter)
app.use('/auth', authRouter)
app.use('/admin', requireAuth, requireSuperAdmin, adminRouter)
app.use('/households', requireAuth, householdsRouter)
app.use('/households/:hid/products', requireAuth, requireHouseholdAccess, productsRouter)
app.use('/households/:hid/lists', requireAuth, requireHouseholdAccess, listsRouter)
app.use('/households/:hid/lists', requireAuth, requireHouseholdAccess, sessionsRouter)
app.use('/notifications', requireAuth, notificationsRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
