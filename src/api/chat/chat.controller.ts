import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { LlmService } from '../llm/llm.service';
import { LlmResponse } from '../llm/llm.types';
import { ClientService } from '../client/client.service';
import { ProjectService } from '../project/project.service';
import { EstimateService } from '../estimate/estimate.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';
import {
  ConversationStatus,
  PrintMaterial,
  PrintQuality,
} from '@prisma/client';

function normalizeWhatsappPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.endsWith('@c.us') || trimmed.endsWith('@s.whatsapp.net')) {
    return trimmed;
  }
  const digits = trimmed.replace(/[^\d]/g, '');
  return digits ? `${digits}@c.us` : trimmed;
}

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly llmService: LlmService,
    private readonly clientService: ClientService,
    private readonly projectService: ProjectService,
    private readonly estimateService: EstimateService,
  ) {}

  /**
   * POST /chat/incoming
   * Called by the WhatsApp bot. Returns the reply text to send back.
   */
  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  async incoming(@Body() dto: IncomingMessageDto): Promise<{ reply: string }> {
    this.logger.log(`Incoming from ${dto.phone}`);

    // 1. Persist inbound message + load recent context
    const context = await this.chatService.handleIncoming(dto);

    // 2. Send to LLM
    let llmResponse: LlmResponse;
    try {
      llmResponse = await this.llmService.enqueue({
        conversationId: context.conversationId,
        messages: context.recentMessages,
      });
    } catch (err) {
      this.logger.error('LLM call failed in /chat/incoming', err);
      const fallbackReply =
        'Thanks for your message. I am having trouble processing it right now, but our team will follow up shortly.';
      await this.chatService.saveAssistantReply(
        context.conversationId,
        fallbackReply,
      );
      return { reply: fallbackReply };
    }

    let reply: string;

    // 3a. Plain conversational response — still gathering info
    if (llmResponse.type === 'text') {
      reply = llmResponse.content.trim();
      if (!reply) {
        reply =
          'Thanks for your message. Could you share a bit more detail about your 3D printing request?';
      }
    } else {
      // 3b. invoice_intent — LLM has collected enough info, create records
      const payload = llmResponse.payload;
      const resolvedPhone = normalizeWhatsappPhone(
        payload.client.phone?.trim() || dto.phone,
      );

      try {
        // Upsert client (may already exist from a previous conversation)
        let client = await this.clientService.findByPhone(resolvedPhone);
        if (!client) {
          client = await this.clientService.create({
            name: payload.client.name,
            phone: resolvedPhone,
            email: payload.client.email ?? undefined,
            company: payload.client.company ?? undefined,
          });
        }

        // Create project
        const project = await this.projectService.create({
          clientId: client.id,
          name: payload.project.name,
          description: payload.project.description ?? undefined,
          material: (payload.project.material as PrintMaterial) ?? undefined,
          quality: (payload.project.quality as PrintQuality) ?? undefined,
          weightGrams: payload.project.weightGrams ?? undefined,
          printHours: payload.project.printHours ?? undefined,
          notes: payload.project.notes ?? undefined,
        });

        // Create estimate with line items (no pricing yet — operator sets that)
        await this.estimateService.create({
          projectId: project.id,
          items: payload.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
          })),
        });

        // Link client to conversation + transition status
        await this.chatService.linkClientToConversation(
          context.conversationId,
          client.id,
        );
        await this.chatService.updateConversationStatus(
          context.conversationId,
          ConversationStatus.awaiting_internal_input,
        );

        reply =
          'Thank you! I have all the details I need. Our team will review your request and send you a quote shortly.';

        this.logger.log(
          `Invoice intent processed: client=${client.id} project=${project.id} conversation=${context.conversationId}`,
        );
      } catch (err) {
        this.logger.error('Failed to process invoice intent', err);
        reply =
          'Thank you for the details! Our team will be in touch shortly with a quote.';
      }
    }

    // 4. Persist assistant reply
    await this.chatService.saveAssistantReply(context.conversationId, reply);

    return { reply };
  }
}
