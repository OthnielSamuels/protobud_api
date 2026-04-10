import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { IncomingMessageDto } from '../dto/incoming-message.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat/incoming
   *
   * Called by:
   * - WhatsApp bot service (Step 5)
   * - Directly for testing
   *
   * Returns a plain reply string that the caller sends back to WhatsApp.
   * LLM integration will be wired here in Step 4.
   */
  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  async incoming(@Body() dto: IncomingMessageDto): Promise<{ reply: string }> {
    this.logger.log(`Incoming from ${dto.phone}`);

    // Step 3: store message + build context
    const context = await this.chatService.handleIncoming(dto);

    // Placeholder — LlmService replaces this in Step 4
    const reply = `[${context.status}] Message received. LLM integration pending.`;

    await this.chatService.saveAssistantReply(context.conversationId, reply);

    return { reply };
  }
}
