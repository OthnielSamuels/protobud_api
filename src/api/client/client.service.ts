import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { Prisma } from '@prisma/client';

// Select only what we need — avoid pulling unnecessary columns
const CLIENT_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  company: true,
  notes: true,
  createdAt: true,
} as const;

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(private readonly db: PrismaService) {}

  async create(dto: CreateClientDto) {
    try {
      return await this.db.client.create({
        data: dto,
        select: CLIENT_SELECT,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Client with phone ${dto.phone} already exists`,
        );
      }
      throw e;
    }
  }

  async findAll() {
    return this.db.client.findMany({
      select: CLIENT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100, // Safety limit — no unbounded queries
    });
  }

  async findOne(id: string) {
    const client = await this.db.client.findUnique({
      where: { id },
      select: CLIENT_SELECT,
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async findByPhone(phone: string) {
    return this.db.client.findUnique({
      where: { phone },
      select: CLIENT_SELECT,
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureExists(id);
    return this.db.client.update({
      where: { id },
      data: dto,
      select: CLIENT_SELECT,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.db.client.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Used by the invoice pipeline:
   * Find existing client by phone or create a new one.
   * Avoids duplicate clients from WhatsApp conversations.
   */
  async findOrCreate(dto: CreateClientDto) {
    const existing = await this.db.client.findUnique({
      where: { phone: dto.phone },
      select: CLIENT_SELECT,
    });
    if (existing) return existing;

    this.logger.log(`Creating new client for phone: ${dto.phone}`);
    return this.db.client.create({ data: dto, select: CLIENT_SELECT });
  }

  // ------------------------------------------------------------------
  private async ensureExists(id: string): Promise<void> {
    const count = await this.db.client.count({ where: { id } });
    if (!count) throw new NotFoundException(`Client ${id} not found`);
  }
}
