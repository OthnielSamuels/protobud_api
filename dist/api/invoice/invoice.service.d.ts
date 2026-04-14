import { PrismaService } from '../../prisma/database.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
export declare class InvoiceService {
    private readonly db;
    private readonly logger;
    constructor(db: PrismaService);
    create(dto: CreateInvoiceDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        notes: string | null;
        estimate: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
        };
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    findAll(): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        notes: string | null;
        estimate: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
        };
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        notes: string | null;
        estimate: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
        };
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    findByClient(clientId: string): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        notes: string | null;
        estimate: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
        };
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }[]>;
    update(id: string, dto: UpdateInvoiceDto): Promise<{
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        client: {
            id: string;
            phone: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        notes: string | null;
        estimate: {
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
        };
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    private ensureExists;
}
