import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import path from 'path'
import bcrypt from 'bcrypt'
import { fileURLToPath } from 'url'
import connectDB from './config/db.js'
import User from './models/User.js'
import authRoutes from './routes/authRoutes.js'
import emergencyRoutes from './routes/emergencyRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import hospitalRoutes from "./routes/hospitalRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import dashboardRoutes from "./routes/DashboardRoutes.js";
import ReportRoutes from "./routes/ReportRoutes.js";
import donorRoutes from './routes/donorRoutes.js'



const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

const app = express()

const seedAdminUser = async () => {
  const adminEmail = 'admin@bloodbank.local'
  const existingAdmin = await User.findOne({ email: adminEmail })

  if (!existingAdmin) {
    const password = 'Admin123'
    const hashedPassword = await bcrypt.hash(password, 10)
    await User.create({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    })
    console.log(`Seeded admin user: ${adminEmail}`)
  }
}

try {
  await connectDB()
  await seedAdminUser()
} catch (error) {
  console.warn('Database connection skipped at startup:', error.message)
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}))
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/emergency', emergencyRoutes)
app.use('/api/notification', notificationRoutes)
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", ReportRoutes);
app.use('/api/donors', donorRoutes)


// get yar oo tijaabo ah  server-ka haduu shaqaynayo intan hakuuso baxdo
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Blood bank API is connected' })
})

app.get('/', (req,res) => {
    res.send('Blood bank server is ok');
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
