import { EstimateStatus } from '../../../generated/prisma-client/client';
export declare class CreateEstimateItemDto {
    description: string;
    quantity: number;
    unitPrice?: number;
}
export declare class CreateEstimateDto {
    projectId: string;
    notes?: string;
    items: CreateEstimateItemDto[];
}
export declare class UpdateEstimateDto {
    status?: EstimateStatus;
    notes?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
}
export declare class UpdateEstimateItemDto {
    unitPrice?: number;
    totalPrice?: number;
    quantity?: number;
}
