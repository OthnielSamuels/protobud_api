import { LlmService } from './llm.service';
import { LlmEvent } from './llm.types';
export declare class LlmController {
    private readonly llmService;
    constructor(llmService: LlmService);
    getEvents(): LlmEvent[];
    getStatus(): {
        isProcessing: boolean;
        queueDepth: number;
        model: string;
    };
}
