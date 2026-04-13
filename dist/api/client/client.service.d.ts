import { PrismaService } from '../../prisma/database.service';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
export declare class ClientService {
    private readonly db;
    private readonly logger;
    constructor(db: PrismaService);
    create(dto: CreateClientDto): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    findAll(): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }[]>;
    findOne(id: string): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    findByPhone(phone: string): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    } | null>;
    update(id: string, dto: UpdateClientDto): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    findOrCreate(dto: CreateClientDto): Promise<{
        phone: string;
        id: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    private ensureExists;
}
