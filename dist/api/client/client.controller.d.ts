import { ClientService } from './client.service';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
export declare class ClientController {
    private readonly clientService;
    constructor(clientService: ClientService);
    create(dto: CreateClientDto): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    findAll(phone?: string): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    } | null> | Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        phone: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
    update(id: string, dto: UpdateClientDto): Promise<{
        id: string;
        phone: string;
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
        id: string;
        phone: string;
        createdAt: Date;
        name: string;
        email: string | null;
        company: string | null;
        notes: string | null;
    }>;
}
