"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/kpis', (_req, res) => {
    res.json({
        success: true,
        data: {
            totalCustomers: 144,
            activeCustomers: 38,
            newCustomersThisMonth: 12,
            totalLeads: 89,
            conversionRate: 26.4,
            activeProjects: 7,
            completedProjects: 14,
            delayedProjects: 2,
            pendingInvoices: 11,
            overduePayments: 3,
            totalRevenue: 24500000,
            totalExpenses: 8200000,
            netIncome: 16300000,
            outstandingReceivables: 5800000,
        }
    });
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map