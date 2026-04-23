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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateController = void 0;
const common_1 = require("@nestjs/common");
const estimate_service_1 = require("./estimate.service");
const estimate_dto_1 = require("../dto/estimate.dto");
let EstimateController = class EstimateController {
    constructor(estimateService) {
        this.estimateService = estimateService;
    }
    create(dto) {
        return this.estimateService.create(dto);
    }
    findOne(id) {
        return this.estimateService.findOne(id);
    }
    findByProject(projectId) {
        return this.estimateService.findByProject(projectId);
    }
    update(id, dto) {
        return this.estimateService.update(id, dto);
    }
    updateItem(itemId, dto) {
        return this.estimateService.updateItem(itemId, dto);
    }
    remove(id) {
        return this.estimateService.remove(id);
    }
};
exports.EstimateController = EstimateController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [estimate_dto_1.CreateEstimateDto]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "findByProject", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, estimate_dto_1.UpdateEstimateDto]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('items/:itemId'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, estimate_dto_1.UpdateEstimateItemDto]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EstimateController.prototype, "remove", null);
exports.EstimateController = EstimateController = __decorate([
    (0, common_1.Controller)('estimates'),
    __metadata("design:paramtypes", [estimate_service_1.EstimateService])
], EstimateController);
//# sourceMappingURL=estimate.controller.js.map