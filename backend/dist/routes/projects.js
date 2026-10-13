"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (_req, res) => {
    res.json({ success: true, data: [], message: 'Projects module coming soon' });
});
exports.default = router;
//# sourceMappingURL=projects.js.map