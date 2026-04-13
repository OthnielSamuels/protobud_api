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
exports.PipelineController = void 0;
const common_1 = require("@nestjs/common");
const pipeline_service_1 = require("./pipeline.service");
const pipeline_dto_1 = require("../dto/pipeline.dto");
let PipelineController = class PipelineController {
    constructor(pipelineService) {
        this.pipelineService = pipelineService;
    }
    getPending() {
        return this.pipelineService.getPendingConversations();
    }
    getDetail(id) {
        return this.pipelineService.getConversationDetail(id);
    }
    finalize(dto) {
        return this.pipelineService.finalizeEstimate(dto);
    }
    notify(dto) {
        return this.pipelineService.notifyClient(dto);
    }
    reject(id, dto) {
        return this.pipelineService.rejectEstimate(id, dto.reason);
    }
};
exports.PipelineController = PipelineController;
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "getPending", null);
__decorate([
    (0, common_1.Get)('conversations/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "getDetail", null);
__decorate([
    (0, common_1.Post)('finalize'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pipeline_dto_1.FinalizeEstimateRequestDto]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('notify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pipeline_dto_1.NotifyClientRequestDto]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "notify", null);
__decorate([
    (0, common_1.Post)('estimates/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pipeline_dto_1.RejectEstimateRequestDto]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "reject", null);
exports.PipelineController = PipelineController = __decorate([
    (0, common_1.Controller)('pipeline'),
    __metadata("design:paramtypes", [pipeline_service_1.PipelineService])
], PipelineController);
//# sourceMappingURL=pipeline.controller.js.map