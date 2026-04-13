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
var ProjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const PROJECT_SELECT = {
    id: true,
    clientId: true,
    name: true,
    description: true,
    status: true,
    material: true,
    quality: true,
    fileUrl: true,
    weightGrams: true,
    printHours: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
};
let ProjectService = ProjectService_1 = class ProjectService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(ProjectService_1.name);
    }
    async create(dto) {
        return this.db.project.create({
            data: {
                clientId: dto.clientId,
                name: dto.name,
                description: dto.description,
                material: dto.material,
                quality: dto.quality,
                fileUrl: dto.fileUrl,
                weightGrams: dto.weightGrams,
                printHours: dto.printHours,
                notes: dto.notes,
            },
            select: PROJECT_SELECT,
        });
    }
    async findAll() {
        return this.db.project.findMany({
            select: PROJECT_SELECT,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }
    async findByClient(clientId) {
        return this.db.project.findMany({
            where: { clientId },
            select: PROJECT_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const project = await this.db.project.findUnique({
            where: { id },
            select: PROJECT_SELECT,
        });
        if (!project)
            throw new common_1.NotFoundException(`Project ${id} not found`);
        return project;
    }
    async update(id, dto) {
        await this.ensureExists(id);
        return this.db.project.update({
            where: { id },
            data: dto,
            select: PROJECT_SELECT,
        });
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.db.project.delete({ where: { id } });
        return { deleted: true };
    }
    async ensureExists(id) {
        const count = await this.db.project.count({ where: { id } });
        if (!count)
            throw new common_1.NotFoundException(`Project ${id} not found`);
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = ProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService])
], ProjectService);
//# sourceMappingURL=project.service.js.map