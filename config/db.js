import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blood-bank'
  const useMemoryFallback = process.env.USE_IN_MEMORY_DB === 'true'

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    })
    console.log(`MongoDB connected successfully: ${mongoose.connection.host}`)
    return
  } catch (error) {
    console.error(`Unable to connect to MongoDB at ${mongoUri}: ${error.message}`)
  }

  if (!useMemoryFallback) {
    console.error('MongoDB connection failed and in-memory fallback is disabled. Please start your MongoDB service or set MONGODB_URI correctly.')
    process.exit(1)
  }

  try {
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'blood-bank',
        },
      })
    }

    const memoryUri = mongoServer.getUri()
    await mongoose.connect(memoryUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    })
    console.log(`MongoDB in-memory server connected: ${mongoose.connection.host}`)
    console.warn('Running with an in-memory database. Data will not persist after restart.')
  } catch (error) {
    console.error('MongoDB in-memory connection failed:', error.message)
    process.exit(1)
  }
}

export default connectDB
