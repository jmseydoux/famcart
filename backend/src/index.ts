import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import statusRouter from './routes/status'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/status', statusRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
