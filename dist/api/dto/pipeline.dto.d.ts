export declare class FinalizeItemDto {
    itemId: string;
    unitPrice: number;
    totalPrice: number;
    quantity?: number;
}
export declare class FinalizeEstimateRequestDto {
    estimateId: string;
    items: FinalizeItemDto[];
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
}
export declare class NotifyClientRequestDto {
    conversationId: string;
    message: string;
}
export declare class RejectEstimateRequestDto {
    reason?: string;
}
