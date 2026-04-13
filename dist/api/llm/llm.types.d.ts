import { MessageRole } from '../../../generated/prisma-client/client';
export interface LlmMessage {
    role: MessageRole;
    content: string;
}
export interface LlmRequest {
    conversationId: string;
    messages: LlmMessage[];
}
export type LlmResponseType = 'text' | 'invoice_intent';
export interface LlmTextResponse {
    type: 'text';
    content: string;
}
export interface InvoiceIntentPayload {
    client: {
        name: string;
        phone: string;
        email?: string;
        company?: string;
    };
    project: {
        name: string;
        description?: string;
        material?: string;
        quality?: string;
        weightGrams?: number;
        printHours?: number;
        notes?: string;
    };
    items: Array<{
        description: string;
        quantity: number;
    }>;
}
export interface LlmInvoiceIntentResponse {
    type: 'invoice_intent';
    payload: InvoiceIntentPayload;
}
export type LlmResponse = LlmTextResponse | LlmInvoiceIntentResponse;
export interface OllamaRequestBody {
    model: string;
    messages: Array<{
        role: string;
        content: string;
    }>;
    stream: false;
    options: {
        temperature: number;
        num_predict: number;
        num_ctx: number;
    };
}
export interface OllamaResponse {
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
}
