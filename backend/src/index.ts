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
import { VerificationController } from './controllers/verificationController';

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

// Secure Signed Document Download Endpoint (token required)
app.get('/api/verification/document/download', VerificationController.downloadSignedDocument);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'SAHAY Backend' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SAHAY Backend] Server is running on port ${PORT}`);
});
