"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClients = getClients;
exports.getClient = getClient;
exports.createClient = createClient;
exports.updateClient = updateClient;
exports.deleteClient = deleteClient;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getClients(req, res) {
    try {
        const { page = 1, limit = 20, category, status, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (category)
            where.category = category;
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { companyName: { contains: String(search), mode: 'insensitive' } },
                { contactPersonName: { contains: String(search), mode: 'insensitive' } },
                { phone: { contains: String(search) } },
            ];
        }
        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip,
                take: Number(limit),
                include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.client.count({ where })
        ]);
        res.json({
            success: true,
            data: clients,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function getClient(req, res) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                fieldVisits: { orderBy: { visitDate: 'desc' }, take: 10 },
                opportunities: true,
                contracts: true,
                invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
            }
        });
        if (!client) {
            res.status(404).json({ success: false, message: 'Client not found' });
            return;
        }
        res.json({ success: true, data: client });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function createClient(req, res) {
    try {
        const client = await prisma.client.create({ data: req.body });
        res.status(201).json({ success: true, data: client, message: 'Client created successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function updateClient(req, res) {
    try {
        const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
        res.json({ success: true, data: client, message: 'Client updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function deleteClient(req, res) {
    try {
        await prisma.client.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Client deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
//# sourceMappingURL=clientsController.js.map