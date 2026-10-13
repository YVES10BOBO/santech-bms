"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fieldVisitsController_1 = require("../controllers/fieldVisitsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', fieldVisitsController_1.getFieldVisits);
router.get('/:id', fieldVisitsController_1.getFieldVisit);
router.post('/', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'MARKETING_MANAGER'), fieldVisitsController_1.createFieldVisit);
router.put('/:id', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), fieldVisitsController_1.updateFieldVisit);
exports.default = router;
//# sourceMappingURL=fieldVisits.js.map