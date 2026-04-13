import { OnModuleDestroy } from '@nestjs/common';
import { LlmRequest, LlmResponse } from './llm.types';
export declare class LlmService implements OnModuleDestroy {
    private readonly logger;
    private readonly ollamaHost;
    private readonly model;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly queue;
    private isProcessing;
    constructor();
    onModuleDestroy(): void;
    enqueue(request: LlmRequest): Promise<LlmResponse>;
    private processNext;
    private callOllama;
    private fetchWithTimeout;
    private sleep;
}
