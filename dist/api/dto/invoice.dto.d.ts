import { InvoiceStatus } from '../../../generated/prisma-client/client';
export declare class CreateInvoiceDto {
    estimateId: string;
    clientId: string;
    notes?: string;
}
export declare class UpdateInvoiceDto {
    status?: InvoiceStatus;
    invoiceNumber?: string;
    dueDate?: string;
    paidAt?: string;
    notes?: string;
}
