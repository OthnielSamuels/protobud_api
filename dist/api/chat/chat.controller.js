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
var ChatController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const llm_service_1 = require("../llm/llm.service");
const client_service_1 = require("../client/client.service");
const project_service_1 = require("../project/project.service");
const estimate_service_1 = require("../estimate/estimate.service");
const incoming_message_dto_1 = require("../dto/incoming-message.dto");
const client_1 = require("@prisma/client");
function normalizeWhatsappPhone(phone) {
    const trimmed = phone.trim();
    if (trimmed.endsWith('@c.us') || trimmed.endsWith('@s.whatsapp.net')) {
        return trimmed;
    }
    const digits = trimmed.replace(/[^\d]/g, '');
    return digits ? `${digits}@c.us` : trimmed;
}
let ChatController = ChatController_1 = class ChatController {
    constructor(chatService, llmService, clientService, projectService, estimateService) {
        this.chatService = chatService;
        this.llmService = llmService;
        this.clientService = clientService;
        this.projectService = projectService;
        this.estimateService = estimateService;
        this.logger = new common_1.Logger(ChatController_1.name);
    }
    async incoming(dto) {
        this.logger.log(`Incoming from ${dto.phone}`);
        const context = await this.chatService.handleIncoming(dto);
        let llmResponse;
        try {
            llmResponse = await this.llmService.enqueue({
                conversationId: context.conversationId,
                messages: context.recentMessages,
            });
        }
        catch (err) {
            this.logger.error('LLM call failed in /chat/incoming', err);
            const fallbackReply = 'Thanks for your message. I am having trouble processing it right now, but our team will follow up shortly.';
            await this.chatService.saveAssistantReply(context.conversationId, fallbackReply);
            return { reply: fallbackReply };
        }
        let reply;
        if (llmResponse.type === 'text') {
            reply = llmResponse.content.trim();
            if (!reply) {
                reply =
                    'Thanks for your message. Could you share a bit more detail about your 3D printing request?';
            }
        }
        else {
            const payload = llmResponse.payload;
            const resolvedPhone = normalizeWhatsappPhone(payload.client.phone?.trim() || dto.phone);
            try {
                let client = await this.clientService.findByPhone(resolvedPhone);
                if (!client) {
                    client = await this.clientService.create({
                        name: payload.client.name,
                        phone: resolvedPhone,
                        email: payload.client.email ?? undefined,
                        company: payload.client.company ?? undefined,
                    });
                }
                const project = await this.projectService.create({
                    clientId: client.id,
                    name: payload.project.name,
                    description: payload.project.description ?? undefined,
                    material: payload.project.material ?? undefined,
                    quality: payload.project.quality ?? undefined,
                    weightGrams: payload.project.weightGrams ?? undefined,
                    printHours: payload.project.printHours ?? undefined,
                    notes: payload.project.notes ?? undefined,
                });
                await this.estimateService.create({
                    projectId: project.id,
                    items: payload.items.map((i) => ({
                        description: i.description,
                        quantity: i.quantity,
                    })),
                });
                await this.chatService.linkClientToConversation(context.conversationId, client.id);
                await this.chatService.updateConversationStatus(context.conversationId, client_1.ConversationStatus.awaiting_internal_input);
                reply =
                    'Thank you! I have all the details I need. Our team will review your request and send you a quote shortly.';
                this.logger.log(`Invoice intent processed: client=${client.id} project=${project.id} conversation=${context.conversationId}`);
            }
            catch (err) {
                this.logger.error('Failed to process invoice intent', err);
                reply =
                    'Thank you for the details! Our team will be in touch shortly with a quote.';
            }
        }
        await this.chatService.saveAssistantReply(context.conversationId, reply);
        return { reply };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('incoming'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incoming_message_dto_1.IncomingMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "incoming", null);
exports.ChatController = ChatController = ChatController_1 = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        llm_service_1.LlmService,
        client_service_1.ClientService,
        project_service_1.ProjectService,
        estimate_service_1.EstimateService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map