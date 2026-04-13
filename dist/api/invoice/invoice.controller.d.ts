import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
export declare class InvoiceController {
    private readonly invoiceService;
    constructor(invoiceService: InvoiceService);
    create(dto: CreateInvoiceDto): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        estimate: {
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
        };
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    findAll(clientId?: string): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        estimate: {
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
        };
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        estimate: {
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
        };
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    update(id: string, dto: UpdateInvoiceDto): Promise<{
        client: {
            phone: string;
            id: string;
            name: string;
            email: string | null;
            company: string | null;
        };
        estimate: {
            project: {
                id: string;
                name: string;
                material: import("../../../generated/prisma-client").$Enums.PrintMaterial | null;
                quality: import("../../../generated/prisma-client").$Enums.PrintQuality | null;
            };
            id: string;
            status: import("../../../generated/prisma-client").$Enums.EstimateStatus;
            subtotal: any;
            tax: any;
            total: any;
        };
        id: string;
        status: import("../../../generated/prisma-client").$Enums.InvoiceStatus;
        clientId: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        estimateId: string;
        invoiceNumber: string | null;
        dueDate: Date | null;
        paidAt: Date | null;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
