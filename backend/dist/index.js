"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const citiesRoutes_1 = __importDefault(require("./routes/citiesRoutes"));
const ngoRoutes_1 = __importDefault(require("./routes/ngoRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const verificationController_1 = require("./controllers/verificationController");
const requestController_1 = require("./controllers/requestController");
const db_1 = require("./db");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins for dev development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/cities', citiesRoutes_1.default);
app.use('/api/ngos/verification', verificationRoutes_1.default);
app.use('/api/ngos', ngoRoutes_1.default);
app.use('/api/requests', requestRoutes_1.default);
app.use('/api/chats', chatRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// Secure Signed Document Download Endpoint (token required)
app.get('/api/verification/document/download', verificationController_1.VerificationController.downloadSignedDocument);
// Health Check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'SAHAY Backend' });
});
// Public platform statistics for landing page and overview
app.get('/api/stats', async (_req, res) => {
    try {
        const [totalUsers, totalNgos, verifiedNgos, totalRequests, completedRequests, activeVolunteers, migrantUsers] = await Promise.all([
            db_1.prisma.users.count({ where: { is_active: true } }),
            db_1.prisma.ngos.count(),
            db_1.prisma.ngos.count({
                where: {
                    verification_status: {
                        in: ['GOVERNMENT_VERIFIED', 'CONTACT_VERIFIED', 'MANUALLY_VERIFIED']
                    }
                }
            }),
            db_1.prisma.help_requests.count(),
            db_1.prisma.help_requests.count({ where: { status: 'COMPLETED' } }),
            db_1.prisma.users.count({ where: { role: 'VOLUNTEER', is_active: true } }),
            db_1.prisma.users.count({ where: { role: 'MIGRANT', is_active: true } })
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
    }
    catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ error: 'Failed to fetch public statistics' });
    }
});
// Global Error Handler (ensure JSON responses for all unhandled / Multer errors)
app.use((err, _req, res, _next) => {
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
            const expiredCount = await (0, requestController_1.autoExpirePendingRequests)();
            if (expiredCount > 0) {
                console.log(`[Auto-Expire] Expired ${expiredCount} overdue request(s).`);
            }
        }
        catch (error) {
            console.error('[Auto-Expire] Error:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
});
