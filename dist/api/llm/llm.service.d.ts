import { OnModuleDestroy } from '@nestjs/common';
import { LlmEvent, LlmRequest, LlmResponse } from './llm.types';
export declare class LlmService implements OnModuleDestroy {
    private readonly logger;
    private readonly ollamaHost;
    private readonly model;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly queue;
    private isProcessing;
    private readonly eventBuffer;
    private eventCounter;
    private readonly MAX_EVENTS;
    constructor();
    onModuleDestroy(): void;
    getEvents(): LlmEvent[];
    getStatus(): {
        isProcessing: boolean;
        queueDepth: number;
        model: string;
    };
    private emitEvent;
    enqueue(request: LlmRequest): Promise<LlmResponse>;
    private processNext;
    private callOllama;
    private fetchWithTimeout;
    private sleep;
}
