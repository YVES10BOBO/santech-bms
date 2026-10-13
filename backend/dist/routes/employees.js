"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), (_req, res) => {
    res.json({ success: true, data: [], message: 'Employee module coming soon' });
});
exports.default = router;
//# sourceMappingURL=employees.js.map