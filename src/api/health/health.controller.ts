import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/database.service';

/**
 * GET /health
 * Used by Docker healthcheck and monitoring.
 * Verifies NestJS is up AND the DB connection is alive.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async check() {
    // Lightweight DB ping — no table scan
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
