import { PrismaService } from '../../prisma/database.service';
import { EstimateService } from '../estimate/estimate.service';
import { InvoiceService } from '../invoice/invoice.service';
import { ChatService } from '../chat/chat.service';
import { WhatsappService } from '../whatsapp-bot/whatsapp.service';
export interface FinalizeEstimateDto {
    estimateId: string;
    items: Array<{
        itemId: string;
        unitPrice: number;
        totalPrice: number;
        quantity?: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
}
export interface NotifyClientDto {
    conversationId: string;
    message: string;
}
export declare class PipelineService {
    private readonly db;
    private readonly estimateService;
    private readonly invoiceService;
    private readonly chatService;
    private readonly whatsapp;
    private readonly logger;
    constructor(db: PrismaService, estimateService: EstimateService, invoiceService: InvoiceService, chatService: ChatService, whatsapp: WhatsappService);
    getPendingConversations(): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            company: string | null;
        } | null;
        phone: string;
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
        updatedAt: Date;
    }[]>;
    getConversationDetail(conversationId: string): Promise<{
        conversation: {
            client: {
                phone: string;
                id: string;
                name: string;
                email: string | null;
                company: string | null;
            } | null;
            phone: string;
            id: string;
            status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
            createdAt: Date;
            updatedAt: Date;
            messages: {
                createdAt: Date;
                role: import("../../../generated/prisma-client").$Enums.MessageRole;
                content: string;
            }[];
        };
        projects: any;
    }>;
    finalizeEstimate(dto: FinalizeEstimateDto): Promise<{
        invoice: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        } | null;
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        subtotal: any;
        tax: any;
        total: any;
    } | null>;
    notifyClient(dto: NotifyClientDto): Promise<{
        completed: boolean;
        whatsappSent: boolean;
    }>;
    rejectEstimate(estimateId: string, reason?: string): Promise<{
        rejected: boolean;
    }>;
}
