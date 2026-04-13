import { PrismaService } from '../../prisma/database.service';
export declare class HealthController {
    private readonly db;
    constructor(db: PrismaService);
    check(): Promise<{
        status: string;
        timestamp: string;
    }>;
}
