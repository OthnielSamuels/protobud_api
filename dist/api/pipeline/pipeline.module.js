"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineModule = void 0;
const common_1 = require("@nestjs/common");
const pipeline_controller_1 = require("./pipeline.controller");
const pipeline_service_1 = require("./pipeline.service");
const estimate_module_1 = require("../estimate/estimate.module");
const invoice_module_1 = require("../invoice/invoice.module");
const chat_module_1 = require("../chat/chat.module");
const whatsapp_module_1 = require("../whatsapp-bot/whatsapp.module");
let PipelineModule = class PipelineModule {
};
exports.PipelineModule = PipelineModule;
exports.PipelineModule = PipelineModule = __decorate([
    (0, common_1.Module)({
        imports: [
            estimate_module_1.EstimateModule,
            invoice_module_1.InvoiceModule,
            chat_module_1.ChatModule,
            whatsapp_module_1.WhatsappModule,
        ],
        controllers: [pipeline_controller_1.PipelineController],
        providers: [pipeline_service_1.PipelineService],
    })
], PipelineModule);
//# sourceMappingURL=pipeline.module.js.map