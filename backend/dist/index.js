"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});
app.use('/api', limiter);
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
app.use((0, morgan_1.default)('dev'));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SAN-BMS API' });
});
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const clients_1 = __importDefault(require("./routes/clients"));
const fieldVisits_1 = __importDefault(require("./routes/fieldVisits"));
const employees_1 = __importDefault(require("./routes/employees"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const projects_1 = __importDefault(require("./routes/projects"));
const finance_1 = __importDefault(require("./routes/finance"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
app.use('/api/auth', auth_1.default);
app.use('/api/clients', clients_1.default);
app.use('/api/field-visits', fieldVisits_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/finance', finance_1.default);
app.use('/api/dashboard', dashboard_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});
app.listen(PORT, () => {
    console.log(`🚀 SAN-BMS API running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map