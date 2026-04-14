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
var ClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const client_1 = require("@prisma/client/runtime/client");
const CLIENT_SELECT = {
    id: true,
    name: true,
    phone: true,
    email: true,
    company: true,
    notes: true,
    createdAt: true,
};
let ClientService = ClientService_1 = class ClientService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(ClientService_1.name);
    }
    async create(dto) {
        try {
            return await this.db.client.create({
                data: dto,
                select: CLIENT_SELECT,
            });
        }
        catch (e) {
            if (e instanceof client_1.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new common_1.ConflictException(`Client with phone ${dto.phone} already exists`);
            }
            throw e;
        }
    }
    async findAll() {
        return this.db.client.findMany({
            select: CLIENT_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async findOne(id) {
        const client = await this.db.client.findUnique({
            where: { id },
            select: CLIENT_SELECT,
        });
        if (!client)
            throw new common_1.NotFoundException(`Client ${id} not found`);
        return client;
    }
    async findByPhone(phone) {
        return this.db.client.findUnique({
            where: { phone },
            select: CLIENT_SELECT,
        });
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.db.client.update({
            where: { id },
            data: dto,
            select: CLIENT_SELECT,
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.db.client.delete({ where: { id } });
        return { deleted: true };
    }
    async findOrCreate(dto) {
        const existing = await this.db.client.findUnique({
            where: { phone: dto.phone },
            select: CLIENT_SELECT,
        });
        if (existing)
            return existing;
        this.logger.log(`Creating new client for phone: ${dto.phone}`);
        return this.db.client.create({ data: dto, select: CLIENT_SELECT });
    }
    async ensureExists(id) {
        const count = await this.db.client.count({ where: { id } });
        if (!count)
            throw new common_1.NotFoundException(`Client ${id} not found`);
    }
};
exports.ClientService = ClientService;
exports.ClientService = ClientService = ClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService])
], ClientService);
//# sourceMappingURL=client.service.js.map