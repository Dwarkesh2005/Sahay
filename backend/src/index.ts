import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import citiesRoutes from './routes/citiesRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cities', citiesRoutes);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'SAHAY Backend' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SAHAY Backend] Server is running on port ${PORT}`);
});
