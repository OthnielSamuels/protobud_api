import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import {
  CreateEstimateDto,
  UpdateEstimateDto,
  UpdateEstimateItemDto,
} from '../dto/estimate.dto';

const ESTIMATE_SELECT = {
  id: true,
  projectId: true,
  status: true,
  notes: true,
  subtotal: true,
  tax: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
    },
  },
} as const;

@Injectable()
export class EstimateService {
  private readonly logger = new Logger(EstimateService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Create estimate with items in a single transaction.
   * Used by the invoice pipeline after LLM extracts structured data.
   */
  async create(dto: CreateEstimateDto) {
    return this.db.$transaction(async (tx) => {
      const estimate = await tx.estimate.create({
        data: {
          projectId: dto.projectId,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? null,
              // totalPrice computed later by operator
            })),
          },
        },
        select: ESTIMATE_SELECT,
      });

      return estimate;
    });
  }

  async findOne(id: string) {
    const estimate = await this.db.estimate.findUnique({
      where: { id },
      select: ESTIMATE_SELECT,
    });
    if (!estimate) throw new NotFoundException(`Estimate ${id} not found`);
    return estimate;
  }

  async findByProject(projectId: string) {
    return this.db.estimate.findMany({
      where: { projectId },
      select: ESTIMATE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Operator updates: fill in pricing, change status, add notes.
   */
  async update(id: string, dto: UpdateEstimateDto) {
    await this.ensureExists(id);
    return this.db.estimate.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        subtotal: dto.subtotal,
        tax: dto.tax,
        total: dto.total,
      },
      select: ESTIMATE_SELECT,
    });
  }

  /**
   * Operator updates a single line item price.
   */
  async updateItem(itemId: string, dto: UpdateEstimateItemDto) {
    return this.db.estimateItem.update({
      where: { id: itemId },
      data: {
        unitPrice: dto.unitPrice,
        totalPrice: dto.totalPrice,
        quantity: dto.quantity,
      },
      select: {
        id: true,
        description: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Cascade deletes items via DB constraint
    await this.db.estimate.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.db.estimate.count({ where: { id } });
    if (!count) throw new NotFoundException(`Estimate ${id} not found`);
  }
}
