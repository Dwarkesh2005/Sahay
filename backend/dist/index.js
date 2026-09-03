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
const verificationController_1 = require("./controllers/verificationController");
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
// Secure Signed Document Download Endpoint (token required)
app.get('/api/verification/document/download', verificationController_1.VerificationController.downloadSignedDocument);
// Health Check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'SAHAY Backend' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`[SAHAY Backend] Server is running on port ${PORT}`);
});
