import { EstimateService } from './estimate.service';
import { CreateEstimateDto, UpdateEstimateDto, UpdateEstimateItemDto } from '../dto/estimate.dto';
export declare class EstimateController {
    private readonly estimateService;
    constructor(estimateService: EstimateService);
    create(dto: CreateEstimateDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/client").Decimal | null;
        tax: import("@prisma/client/runtime/client").Decimal | null;
        total: import("@prisma/client/runtime/client").Decimal | null;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal | null;
            totalPrice: import("@prisma/client/runtime/client").Decimal | null;
        }[];
        projectId: string;
    }>;
    findOne(id: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/client").Decimal | null;
        tax: import("@prisma/client/runtime/client").Decimal | null;
        total: import("@prisma/client/runtime/client").Decimal | null;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal | null;
            totalPrice: import("@prisma/client/runtime/client").Decimal | null;
        }[];
        projectId: string;
    }>;
    findByProject(projectId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/client").Decimal | null;
        tax: import("@prisma/client/runtime/client").Decimal | null;
        total: import("@prisma/client/runtime/client").Decimal | null;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal | null;
            totalPrice: import("@prisma/client/runtime/client").Decimal | null;
        }[];
        projectId: string;
    }[]>;
    update(id: string, dto: UpdateEstimateDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.EstimateStatus;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/client").Decimal | null;
        tax: import("@prisma/client/runtime/client").Decimal | null;
        total: import("@prisma/client/runtime/client").Decimal | null;
        items: {
            id: string;
            description: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/client").Decimal | null;
            totalPrice: import("@prisma/client/runtime/client").Decimal | null;
        }[];
        projectId: string;
    }>;
    updateItem(itemId: string, dto: UpdateEstimateItemDto): Promise<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/client").Decimal | null;
        totalPrice: import("@prisma/client/runtime/client").Decimal | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
