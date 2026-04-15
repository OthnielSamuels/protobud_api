import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';
import {
  ConversationStatus,
  MessageRole,
  Prisma,
} from '@prisma/client';

// How many messages we pull for LLM context — keep low to save VRAM
const CONTEXT_WINDOW = 5;

export interface ConversationContext {
  conversationId: string;
  phone: string;
  status: ConversationStatus;
  recentMessages: Array<{ role: MessageRole; content: string }>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Main entry point called by ChatController (and later WhatsappModule).
   * Returns the conversationContext for the LLM module to process.
   * Saves the inbound user message to DB.
   */
  async handleIncoming(dto: IncomingMessageDto): Promise<ConversationContext> {
    const conversation = await this.getOrCreateConversation(dto.phone);

    // Persist inbound user message
    await this.db.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.user,
        content: dto.message,
      },
    });

    // Load last N messages for LLM context (ascending order for prompt)
    const recentMessages = await this.getRecentMessages(conversation.id);

    return {
      conversationId: conversation.id,
      phone: dto.phone,
      status: conversation.status,
      recentMessages,
    };
  }

  /**
   * Persist the LLM assistant reply and return the text to send back.
   */
  async saveAssistantReply(
    conversationId: string,
    content: string,
  ): Promise<void> {
    await this.db.message.create({
      data: {
        conversationId,
        role: MessageRole.assistant,
        content,
      },
    });
  }

  /**
   * Transition conversation status (e.g. → awaiting_internal_input).
   */
  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: { status },
    });
  }

  /**
   * Link a resolved client to the conversation.
   */
  async linkClientToConversation(
    conversationId: string,
    clientId: string,
  ): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: { clientId },
    });
  }

  /**
   * Get conversation by phone (for status checks).
   */
  async getConversationByPhone(phone: string) {
    return this.db.conversation.findUnique({
      where: { phone },
      select: { id: true, status: true, clientId: true },
    });
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private async getOrCreateConversation(phone: string) {
    const existing = await this.db.conversation.findUnique({
      where: { phone },
      select: { id: true, status: true },
    });

    if (existing) return existing;

    this.logger.log(`New conversation for phone: ${phone}`);
    return this.db.conversation.create({
      data: { phone },
      select: { id: true, status: true },
    });
  }

  /**
   * Fetch last CONTEXT_WINDOW messages, return in ascending order (oldest first)
   * so the LLM receives them in natural conversation order.
   *
   * Uses the composite index (conversation_id, created_at DESC) efficiently.
   */
  private async getRecentMessages(
    conversationId: string,
  ): Promise<Array<{ role: MessageRole; content: string }>> {
    const messages = await this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_WINDOW,
      select: { role: true, content: true },
    });

    // Reverse to get chronological order for LLM prompt
    return messages.reverse();
  }
}
