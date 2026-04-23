"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const chat_controller_1 = require("./chat.controller");
const chat_service_1 = require("./chat.service");
const llm_module_1 = require("../llm/llm.module");
const client_module_1 = require("../client/client.module");
const project_module_1 = require("../project/project.module");
const estimate_module_1 = require("../estimate/estimate.module");
const invoice_module_1 = require("../invoice/invoice.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            llm_module_1.LlmModule,
            client_module_1.ClientModule,
            project_module_1.ProjectModule,
            estimate_module_1.EstimateModule,
            invoice_module_1.InvoiceModule,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [chat_service_1.ChatService],
        exports: [chat_service_1.ChatService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map