"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clientsController_1 = require("../controllers/clientsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', clientsController_1.getClients);
router.get('/:id', clientsController_1.getClient);
router.post('/', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), clientsController_1.createClient);
router.put('/:id', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), clientsController_1.updateClient);
router.delete('/:id', (0, auth_1.authorize)('SUPER_ADMIN', 'ADMIN'), clientsController_1.deleteClient);
exports.default = router;
//# sourceMappingURL=clients.js.map