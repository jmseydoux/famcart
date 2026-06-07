import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import statusRouter from './routes/status'
import authRouter from './routes/auth'
import householdsRouter from './routes/households'
import listsRouter from './routes/lists'
import suppliersRouter from './routes/suppliers'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/status', statusRouter)
app.use('/auth', authRouter)
app.use('/households', householdsRouter)
app.use('/lists', listsRouter)
app.use('/suppliers', suppliersRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
