"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldVisits = getFieldVisits;
exports.getFieldVisit = getFieldVisit;
exports.createFieldVisit = createFieldVisit;
exports.updateFieldVisit = updateFieldVisit;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function getFieldVisits(req, res) {
    try {
        const { page = 1, limit = 20, category, outcome, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (category)
            where.category = category;
        if (outcome)
            where.outcome = outcome;
        if (search) {
            where.OR = [
                { companyName: { contains: String(search), mode: 'insensitive' } },
                { whatSantechCanSell: { contains: String(search), mode: 'insensitive' } },
                { contactName: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        if (req.user?.role === 'SALES_STAFF') {
            where.recordedById = req.user.id;
        }
        const [visits, total] = await Promise.all([
            prisma.fieldVisit.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    recordedBy: { select: { id: true, firstName: true, lastName: true } },
                    client: { select: { id: true, companyName: true, status: true } }
                },
                orderBy: { visitDate: 'desc' }
            }),
            prisma.fieldVisit.count({ where })
        ]);
        res.json({
            success: true,
            data: visits,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function getFieldVisit(req, res) {
    try {
        const visit = await prisma.fieldVisit.findUnique({
            where: { id: req.params.id },
            include: {
                recordedBy: { select: { id: true, firstName: true, lastName: true } },
                client: true
            }
        });
        if (!visit) {
            res.status(404).json({ success: false, message: 'Field visit not found' });
            return;
        }
        res.json({ success: true, data: visit });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function createFieldVisit(req, res) {
    try {
        const visit = await prisma.fieldVisit.create({
            data: { ...req.body, recordedById: req.user.id }
        });
        res.status(201).json({ success: true, data: visit, message: 'Field visit recorded successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
async function updateFieldVisit(req, res) {
    try {
        const visit = await prisma.fieldVisit.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json({ success: true, data: visit, message: 'Field visit updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
//# sourceMappingURL=fieldVisitsController.js.map