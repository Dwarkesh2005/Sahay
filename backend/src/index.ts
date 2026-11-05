import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import citiesRoutes from './routes/citiesRoutes';
import ngoRoutes from './routes/ngoRoutes';
import requestRoutes from './routes/requestRoutes';
import chatRoutes from './routes/chatRoutes';
import adminRoutes from './routes/adminRoutes';
import verificationRoutes from './routes/verificationRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { VerificationController } from './controllers/verificationController';
import { autoExpirePendingRequests } from './controllers/requestController';
import { prisma } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/ngos/verification', verificationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Secure Signed Document Download Endpoint (token required)
app.get('/api/verification/document/download', VerificationController.downloadSignedDocument);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'SAHAY Backend' });
});

// Public platform statistics for landing page and overview
app.get('/api/stats', async (_req, res) => {
  try {
    const [
      totalUsers,
      totalNgos,
      verifiedNgos,
      totalRequests,
      completedRequests,
      activeVolunteers,
      migrantUsers
    ] = await Promise.all([
      prisma.users.count({ where: { is_active: true } }),
      prisma.ngos.count(),
      prisma.ngos.count({
        where: {
          verification_status: {
            in: ['GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED']
          }
        }
      }),
      prisma.help_requests.count(),
      prisma.help_requests.count({ where: { status: 'COMPLETED' } }),
      prisma.users.count({ where: { role: 'VOLUNTEER', is_active: true } }),
      prisma.users.count({ where: { role: 'MIGRANT', is_active: true } })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalNgos,
        verifiedNgos,
        totalRequests,
        completedRequests,
        activeVolunteers,
        peopleAssisted: completedRequests > 0 ? completedRequests : (migrantUsers || totalUsers)
      }
    });
  } catch (error: any) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch public statistics' });
  }
});

// Global Error Handler (ensure JSON responses for all unhandled / Multer errors)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  if (err?.name === 'MulterError') {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SAHAY Backend] Server is running on port ${PORT}`);

  // Background job: auto-expire pending requests every 5 minutes
  setInterval(async () => {
    try {
      const expiredCount = await autoExpirePendingRequests();
      if (expiredCount > 0) {
        console.log(`[Auto-Expire] Expired ${expiredCount} overdue request(s).`);
      }
    } catch (error) {
      console.error('[Auto-Expire] Error:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
});
