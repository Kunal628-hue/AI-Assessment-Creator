import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { connectMongoDB, createRedisConnection } from './config/database';
import { wsService } from './services/websocketService';
import { initializeQueue } from './queues/generationQueue';
import assignmentRoutes from './routes/assignments';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'VedaAI Assessment Creator API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/assignments', assignmentRoutes);
app.use('/api/upload', uploadRoutes);

// Create HTTP server
const server = http.createServer(app);

// Start services
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Connect to Redis and initialize BullMQ
    const redisConnection = createRedisConnection();
    initializeQueue(redisConnection);

    // Initialize WebSocket
    wsService.initialize(server);

    // Start listening
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║   🚀 VedaAI Assessment Creator API          ║
║   📡 Server:    http://localhost:${PORT}        ║
║   🔌 WebSocket: ws://localhost:${PORT}/ws       ║
║   📊 Health:    http://localhost:${PORT}/api/health  ║
╚══════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
