"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const client_1 = require("@prisma/client/runtime/client");
const INVOICE_SELECT = {
    id: true,
    estimateId: true,
    clientId: true,
    status: true,
    invoiceNumber: true,
    dueDate: true,
    paidAt: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    client: {
        select: { id: true, name: true, phone: true, email: true, company: true },
    },
    estimate: {
        select: {
            id: true,
            status: true,
            subtotal: true,
            tax: true,
            total: true,
            project: {
                select: { id: true, name: true, material: true, quality: true },
            },
        },
    },
};
let InvoiceService = InvoiceService_1 = class InvoiceService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(InvoiceService_1.name);
    }
    async create(dto) {
        try {
            return await this.db.invoice.create({
                data: {
                    estimateId: dto.estimateId,
                    clientId: dto.clientId,
                    notes: dto.notes,
                },
                select: INVOICE_SELECT,
            });
        }
        catch (e) {
            if (e instanceof client_1.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException(`Invoice for estimate ${dto.estimateId} already exists`);
            }
            throw e;
        }
    }
    async findAll() {
        return this.db.invoice.findMany({
            select: INVOICE_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async findOne(id) {
        const invoice = await this.db.invoice.findUnique({
            where: { id },
            select: INVOICE_SELECT,
        });
        if (!invoice)
            throw new common_1.NotFoundException(`Invoice ${id} not found`);
        return invoice;
    }
    async findByClient(clientId) {
        return this.db.invoice.findMany({
            where: { clientId },
            select: INVOICE_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.db.invoice.update({
            where: { id },
            data: {
                status: dto.status,
                invoiceNumber: dto.invoiceNumber,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
                notes: dto.notes,
            },
            select: INVOICE_SELECT,
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.db.invoice.delete({ where: { id } });
        return { deleted: true };
    }
    async ensureExists(id) {
        const count = await this.db.invoice.count({ where: { id } });
        if (!count)
            throw new common_1.NotFoundException(`Invoice ${id} not found`);
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map