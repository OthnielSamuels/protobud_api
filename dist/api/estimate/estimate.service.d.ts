import { PrismaService } from '../../prisma/database.service';
import { CreateEstimateDto, UpdateEstimateDto, UpdateEstimateItemDto } from '../dto/estimate.dto';
export declare class EstimateService {
    private readonly db;
    private readonly logger;
    constructor(db: PrismaService);
    create(dto: CreateEstimateDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: any;
            totalPrice: any;
        }[];
        notes: string | null;
        projectId: string;
        subtotal: any;
        tax: any;
        total: any;
    }>;
    findOne(id: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: any;
            totalPrice: any;
        }[];
        notes: string | null;
        projectId: string;
        subtotal: any;
        tax: any;
        total: any;
    }>;
    findByProject(projectId: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: any;
            totalPrice: any;
        }[];
        notes: string | null;
        projectId: string;
        subtotal: any;
        tax: any;
        total: any;
    }[]>;
    update(id: string, dto: UpdateEstimateDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: any;
            totalPrice: any;
        }[];
        notes: string | null;
        projectId: string;
        subtotal: any;
        tax: any;
        total: any;
    }>;
    updateItem(itemId: string, dto: UpdateEstimateItemDto): Promise<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: any;
        totalPrice: any;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    private ensureExists;
}
