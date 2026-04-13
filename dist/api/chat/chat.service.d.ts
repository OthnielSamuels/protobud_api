import { PrismaService } from '../../prisma/database.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';
import { ConversationStatus, MessageRole } from '../../../generated/prisma-client/client';
export interface ConversationContext {
    conversationId: string;
    phone: string;
    status: ConversationStatus;
    recentMessages: Array<{
        role: MessageRole;
        content: string;
    }>;
}
export declare class ChatService {
    private readonly db;
    private readonly logger;
    constructor(db: PrismaService);
    handleIncoming(dto: IncomingMessageDto): Promise<ConversationContext>;
    saveAssistantReply(conversationId: string, content: string): Promise<void>;
    updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void>;
    linkClientToConversation(conversationId: string, clientId: string): Promise<void>;
    getConversationByPhone(phone: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.ConversationStatus;
        clientId: string | null;
    } | null>;
    private getOrCreateConversation;
    private getRecentMessages;
}
