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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const client_1 = require("@prisma/client");
const CONTEXT_WINDOW = 5;
let ChatService = ChatService_1 = class ChatService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async handleIncoming(dto) {
        const conversation = await this.getOrCreateConversation(dto.phone);
        await this.db.message.create({
            data: {
                conversationId: conversation.id,
                role: client_1.MessageRole.user,
                content: dto.message,
            },
        });
        const recentMessages = await this.getRecentMessages(conversation.id);
        return {
            conversationId: conversation.id,
            phone: dto.phone,
            status: conversation.status,
            recentMessages,
        };
    }
    async saveAssistantReply(conversationId, content) {
        await this.db.message.create({
            data: {
                conversationId,
                role: client_1.MessageRole.assistant,
                content,
            },
        });
    }
    async updateConversationStatus(conversationId, status) {
        await this.db.conversation.update({
            where: { id: conversationId },
            data: { status },
        });
    }
    async linkClientToConversation(conversationId, clientId) {
        await this.db.conversation.update({
            where: { id: conversationId },
            data: { clientId },
        });
    }
    async getConversationByPhone(phone) {
        return this.db.conversation.findUnique({
            where: { phone },
            select: { id: true, status: true, clientId: true },
        });
    }
    async getOrCreateConversation(phone) {
        const existing = await this.db.conversation.findUnique({
            where: { phone },
            select: { id: true, status: true },
        });
        if (existing)
            return existing;
        this.logger.log(`New conversation for phone: ${phone}`);
        return this.db.conversation.create({
            data: { phone },
            select: { id: true, status: true },
        });
    }
    async getRecentMessages(conversationId) {
        const messages = await this.db.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: CONTEXT_WINDOW,
            select: { role: true, content: true },
        });
        return messages.reverse();
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map