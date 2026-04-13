import { LlmMessage } from './llm.types';
export declare function buildPrompt(messages: LlmMessage[]): Array<{
    role: string;
    content: string;
}>;
