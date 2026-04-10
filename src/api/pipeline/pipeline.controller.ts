import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import {
  FinalizeEstimateRequestDto,
  NotifyClientRequestDto,
  RejectEstimateRequestDto,
} from '../dto/pipeline.dto';

/**
 * PipelineController — internal operator API.
 *
 * This is NOT exposed to end users. Operators use this to:
 * 1. See all conversations awaiting their input
 * 2. Review conversation detail + project + estimate
 * 3. Fill in pricing and finalize the estimate
 * 4. Notify the client via WhatsApp
 * 5. Reject an estimate if the job cannot be done
 *
 * In production, add an auth guard to this controller.
 */
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * GET /pipeline/pending
   * Operator work queue — all conversations awaiting internal input.
   */
  @Get('pending')
  getPending() {
    return this.pipelineService.getPendingConversations();
  }

  /**
   * GET /pipeline/conversations/:id
   * Full detail: conversation history + client + projects + estimates.
   */
  @Get('conversations/:id')
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelineService.getConversationDetail(id);
  }

  /**
   * POST /pipeline/finalize
   * Operator fills in all pricing → estimate approved → invoice created (draft).
   */
  @Post('finalize')
  @HttpCode(HttpStatus.OK)
  finalize(@Body() dto: FinalizeEstimateRequestDto) {
    return this.pipelineService.finalizeEstimate(dto);
  }

  /**
   * POST /pipeline/notify
   * Send WhatsApp message to client + mark conversation completed.
   */
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  notify(@Body() dto: NotifyClientRequestDto) {
    return this.pipelineService.notifyClient(dto);
  }

  /**
   * POST /pipeline/estimates/:id/reject
   * Reject an estimate — marks it rejected + completes the conversation.
   */
  @Post('estimates/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectEstimateRequestDto,
  ) {
    return this.pipelineService.rejectEstimate(id, dto.reason);
  }
}
