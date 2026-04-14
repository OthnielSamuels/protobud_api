import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import { EstimateService } from '../estimate/estimate.service';
import { InvoiceService } from '../invoice/invoice.service';
import { ChatService } from '../chat/chat.service';
import { WhatsappService } from '../whatsapp-bot/whatsapp.service';
import {
  ConversationStatus,
  EstimateStatus,
  InvoiceStatus,
} from '../../../generated/prisma-client/client';

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

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly estimateService: EstimateService,
    private readonly invoiceService: InvoiceService,
    private readonly chatService: ChatService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * GET all conversations awaiting operator input.
   * This is the operator's work queue.
   */
  async getPendingConversations() {
    return this.db.conversation.findMany({
      where: { status: ConversationStatus.awaiting_internal_input },
      select: {
        id: true,
        phone: true,
        status: true,
        updatedAt: true,
        client: {
          select: { id: true, name: true, phone: true, company: true },
        },
      },
      orderBy: { updatedAt: 'asc' }, // oldest first — FIFO work queue
    });
  }

  /**
   * GET full detail for a single pending conversation.
   * Returns everything the operator needs to price the job.
   */
  async getConversationDetail(conversationId: string) {
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
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Fetch related project + estimate if client is linked
    let projectsWithEstimates: any = null;
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
        take: 5, // Safety limit
      });
    }

    return { conversation, projects: projectsWithEstimates };
  }

  /**
   * FINALIZE ESTIMATE — operator fills in all pricing.
   *
   * 1. Update each EstimateItem with unit/total price
   * 2. Update Estimate totals + approve it
   * 3. Create Invoice (draft)
   *
   * Does NOT notify the client yet — operator calls notifyClient separately.
   */
  async finalizeEstimate(dto: FinalizeEstimateDto) {
    // Validate estimate exists and is in draft/awaiting state
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
      throw new NotFoundException(`Estimate ${dto.estimateId} not found`);
    }

    if (
      estimate.status !== EstimateStatus.draft &&
      estimate.status !== EstimateStatus.awaiting_internal_input
    ) {
      throw new BadRequestException(
        `Estimate is already ${estimate.status} — cannot finalize`,
      );
    }

    // Run all DB operations in a single transaction
    await this.db.$transaction(async (tx) => {
      // 1. Update each line item
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

      // 2. Approve the estimate and set totals
      await tx.estimate.update({
        where: { id: dto.estimateId },
        data: {
          status: EstimateStatus.approved,
          subtotal: dto.subtotal,
          tax: dto.tax,
          total: dto.total,
          notes: dto.notes,
        },
      });

      // 3. Create invoice (draft — operator sends it separately)
      await tx.invoice.create({
        data: {
          estimateId: dto.estimateId,
          clientId: estimate.project.clientId,
          status: InvoiceStatus.draft,
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

  /**
   * NOTIFY CLIENT via WhatsApp + mark conversation completed.
   *
   * Operator calls this when ready to send the quote to the client.
   * Transitions: awaiting_internal_input → completed.
   */
  async notifyClient(dto: NotifyClientDto) {
    const conversation = await this.db.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { id: true, phone: true, status: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation ${dto.conversationId} not found`,
      );
    }

    if (conversation.status === ConversationStatus.completed) {
      throw new BadRequestException('Conversation is already completed');
    }

    // Send WhatsApp message
    const sent = await this.whatsapp.sendMessage(
      conversation.phone,
      dto.message,
    );

    if (!sent) {
      this.logger.warn(
        `WhatsApp send failed for ${conversation.phone} — marking complete anyway`,
      );
    }

    // Persist the outbound message in conversation history
    await this.db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: dto.message,
      },
    });

    // Transition conversation to completed
    await this.chatService.updateConversationStatus(
      conversation.id,
      ConversationStatus.completed,
    );

    this.logger.log(
      `Conversation ${conversation.id} completed. WhatsApp sent: ${sent}`,
    );

    return { completed: true, whatsappSent: sent };
  }

  /**
   * REJECT ESTIMATE — operator decides not to proceed.
   * Marks estimate rejected and conversation completed.
   */
  async rejectEstimate(estimateId: string, reason?: string) {
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
                  where: { status: ConversationStatus.awaiting_internal_input },
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
      throw new NotFoundException(`Estimate ${estimateId} not found`);
    }

    await this.db.$transaction(async (tx) => {
      await tx.estimate.update({
        where: { id: estimateId },
        data: {
          status: EstimateStatus.rejected,
          notes: reason ? `Rejected: ${reason}` : 'Rejected by operator',
        },
      });

      // Complete the linked conversation if found
      const conversation = estimate.project.client.conversations[0];
      if (conversation) {
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { status: ConversationStatus.completed },
        });
      }
    });

    return { rejected: true };
  }
}
