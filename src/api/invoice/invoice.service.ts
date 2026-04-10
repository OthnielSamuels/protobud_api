import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
import { Prisma } from '@prisma/client';

const INVOICE_SELECT = {
  id: true,
  estimateId: true,
  clientId: true,
  status: true,
  invoiceNumber: true,
  dueDate: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: { id: true, name: true, phone: true, email: true, company: true },
  },
  estimate: {
    select: {
      id: true,
      status: true,
      subtotal: true,
      tax: true,
      total: true,
      project: {
        select: { id: true, name: true, material: true, quality: true },
      },
    },
  },
} as const;

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly db: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
    try {
      return await this.db.invoice.create({
        data: {
          estimateId: dto.estimateId,
          clientId: dto.clientId,
          notes: dto.notes,
        },
        select: INVOICE_SELECT,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Invoice for estimate ${dto.estimateId} already exists`,
        );
      }
      throw e;
    }
  }

  async findAll() {
    return this.db.invoice.findMany({
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      select: INVOICE_SELECT,
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async findByClient(clientId: string) {
    return this.db.invoice.findMany({
      where: { clientId },
      select: INVOICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Operator updates: assign invoice number, set due date, mark paid, etc.
   */
  async update(id: string, dto: UpdateInvoiceDto) {
    await this.ensureExists(id);
    return this.db.invoice.update({
      where: { id },
      data: {
        status: dto.status,
        invoiceNumber: dto.invoiceNumber,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        notes: dto.notes,
      },
      select: INVOICE_SELECT,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.db.invoice.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.db.invoice.count({ where: { id } });
    if (!count) throw new NotFoundException(`Invoice ${id} not found`);
  }
}
