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
var EstimateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const ESTIMATE_SELECT = {
    id: true,
    projectId: true,
    status: true,
    notes: true,
    subtotal: true,
    tax: true,
    total: true,
    createdAt: true,
    updatedAt: true,
    items: {
        select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
        },
    },
};
let EstimateService = EstimateService_1 = class EstimateService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(EstimateService_1.name);
    }
    async create(dto) {
        return this.db.$transaction(async (tx) => {
            const estimate = await tx.estimate.create({
                data: {
                    projectId: dto.projectId,
                    notes: dto.notes,
                    items: {
                        create: dto.items.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice ?? null,
                        })),
                    },
                },
                select: ESTIMATE_SELECT,
            });
            return estimate;
        });
    }
    async findOne(id) {
        const estimate = await this.db.estimate.findUnique({
            where: { id },
            select: ESTIMATE_SELECT,
        });
        if (!estimate)
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
        return estimate;
    }
    async findByProject(projectId) {
        return this.db.estimate.findMany({
            where: { projectId },
            select: ESTIMATE_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.db.estimate.update({
            where: { id },
            data: {
                status: dto.status,
                notes: dto.notes,
                subtotal: dto.subtotal,
                tax: dto.tax,
                total: dto.total,
            },
            select: ESTIMATE_SELECT,
        });
    }
    async updateItem(itemId, dto) {
        return this.db.estimateItem.update({
            where: { id: itemId },
            data: {
                unitPrice: dto.unitPrice,
                totalPrice: dto.totalPrice,
                quantity: dto.quantity,
            },
            select: {
                id: true,
                description: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
            },
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.db.estimate.delete({ where: { id } });
        return { deleted: true };
    }
    async ensureExists(id) {
        const count = await this.db.estimate.count({ where: { id } });
        if (!count)
            throw new common_1.NotFoundException(`Estimate ${id} not found`);
    }
};
exports.EstimateService = EstimateService;
exports.EstimateService = EstimateService = EstimateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService])
], EstimateService);
//# sourceMappingURL=estimate.service.js.map