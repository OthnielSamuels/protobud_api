import { Controller, Get } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmEvent } from './llm.types';

@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  /**
   * GET /llm/events
   * Returns the last 200 AI events (newest first).
   * Used by the operator frontend AI Monitor page.
   */
  @Get('events')
  getEvents(): LlmEvent[] {
    return this.llmService.getEvents();
  }

  /**
   * GET /llm/status
   * Returns current queue state and model name.
   */
  @Get('status')
  getStatus(): { isProcessing: boolean; queueDepth: number; model: string } {
    return this.llmService.getStatus();
  }
}
