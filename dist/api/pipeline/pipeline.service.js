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
var PipelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../prisma/database.service");
const estimate_service_1 = require("../estimate/estimate.service");
const invoice_service_1 = require("../invoice/invoice.service");
const chat_service_1 = require("../chat/chat.service");
const whatsapp_service_1 = require("../whatsapp-bot/whatsapp.service");
const client_1 = require("@prisma/client");
let PipelineService = PipelineService_1 = class PipelineService {
    constructor(db, estimateService, invoiceService, chatService, whatsapp) {
        this.db = db;
        this.estimateService = estimateService;
        this.invoiceService = invoiceService;
        this.chatService = chatService;
        this.whatsapp = whatsapp;
        this.logger = new common_1.Logger(PipelineService_1.name);
    }
    async getPendingConversations() {
        return this.db.conversation.findMany({
            where: { status: client_1.ConversationStatus.awaiting_internal_input },
            select: {
                id: true,
                phone: true,
                status: true,
                updatedAt: true,
                client: {
                    select: { id: true, name: true, phone: true, company: true },
                },
            },
            orderBy: { updatedAt: 'asc' },
        });
    }
    async getConversationDetail(conversationId) {
        const conversation = await this.db.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                client: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        company: true,
                    },
                },
                messages: {
                    select: { role: true, content: true, createdAt: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation ${conversationId} not found`);
        }
        let projectsWithEstimates = null;
        if (conversation.client) {
            projectsWithEstimates = await this.db.project.findMany({
                where: { clientId: conversation.client.id },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    material: true,
                    quality: true,
                    weightGrams: true,
                    printHours: true,
                    notes: true,
                    estimates: {
                        select: {
                            id: true,
                            status: true,
                            notes: true,
                            subtotal: true,
                            tax: true,
                            total: true,
                            items: {
                                select: {
                                    id: true,
                                    description: true,
                                    quantity: true,
                                    unitPrice: true,
                                    totalPrice: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });
        }
        return { conversation, projects: projectsWithEstimates };
    }
    async finalizeEstimate(dto) {
        const estimate = await this.db.estimate.findUnique({
            where: { id: dto.estimateId },
            select: {
                id: true,
                status: true,
                projectId: true,
                project: { select: { clientId: true } },
            },
        });
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${dto.estimateId} not found`);
        }
        if (estimate.status !== client_1.EstimateStatus.draft &&
            estimate.status !== client_1.EstimateStatus.awaiting_internal_input) {
            throw new common_1.BadRequestException(`Estimate is already ${estimate.status} — cannot finalize`);
        }
        await this.db.$transaction(async (tx) => {
            for (const item of dto.items) {
                await tx.estimateItem.update({
                    where: { id: item.itemId },
                    data: {
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        ...(item.quantity !== undefined && { quantity: item.quantity }),
                    },
                });
            }
            await tx.estimate.update({
                where: { id: dto.estimateId },
                data: {
                    status: client_1.EstimateStatus.approved,
                    subtotal: dto.subtotal,
                    tax: dto.tax,
                    total: dto.total,
                    notes: dto.notes,
                },
            });
            await tx.invoice.create({
                data: {
                    estimateId: dto.estimateId,
                    clientId: estimate.project.clientId,
                    status: client_1.InvoiceStatus.draft,
                },
            });
        });
        this.logger.log(`Estimate ${dto.estimateId} finalized → invoice created`);
        return this.db.estimate.findUnique({
            where: { id: dto.estimateId },
            select: {
                id: true,
                status: true,
                subtotal: true,
                tax: true,
                total: true,
                invoice: { select: { id: true, status: true } },
            },
        });
    }
    async notifyClient(dto) {
        const conversation = await this.db.conversation.findUnique({
            where: { id: dto.conversationId },
            select: { id: true, phone: true, status: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException(`Conversation ${dto.conversationId} not found`);
        }
        if (conversation.status === client_1.ConversationStatus.completed) {
            throw new common_1.BadRequestException('Conversation is already completed');
        }
        const sent = await this.whatsapp.sendMessage(conversation.phone, dto.message);
        if (!sent) {
            this.logger.warn(`WhatsApp send failed for ${conversation.phone} — marking complete anyway`);
        }
        await this.db.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: dto.message,
            },
        });
        await this.chatService.updateConversationStatus(conversation.id, client_1.ConversationStatus.completed);
        this.logger.log(`Conversation ${conversation.id} completed. WhatsApp sent: ${sent}`);
        return { completed: true, whatsappSent: sent };
    }
    async rejectEstimate(estimateId, reason) {
        const estimate = await this.db.estimate.findUnique({
            where: { id: estimateId },
            select: {
                id: true,
                status: true,
                project: {
                    select: {
                        clientId: true,
                        client: {
                            select: {
                                conversations: {
                                    where: { status: client_1.ConversationStatus.awaiting_internal_input },
                                    select: { id: true, phone: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!estimate) {
            throw new common_1.NotFoundException(`Estimate ${estimateId} not found`);
        }
        await this.db.$transaction(async (tx) => {
            await tx.estimate.update({
                where: { id: estimateId },
                data: {
                    status: client_1.EstimateStatus.rejected,
                    notes: reason ? `Rejected: ${reason}` : 'Rejected by operator',
                },
            });
            const conversation = estimate.project.client.conversations[0];
            if (conversation) {
                await tx.conversation.update({
                    where: { id: conversation.id },
                    data: { status: client_1.ConversationStatus.completed },
                });
            }
        });
        return { rejected: true };
    }
};
exports.PipelineService = PipelineService;
exports.PipelineService = PipelineService = PipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.PrismaService,
        estimate_service_1.EstimateService,
        invoice_service_1.InvoiceService,
        chat_service_1.ChatService,
        whatsapp_service_1.WhatsappService])
], PipelineService);
//# sourceMappingURL=pipeline.service.js.map