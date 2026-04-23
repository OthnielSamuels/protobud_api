"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const prompt_builder_1 = require("./prompt.builder");
const llm_parser_1 = require("./llm.parser");
let LlmService = LlmService_1 = class LlmService {
    constructor() {
        this.logger = new common_1.Logger(LlmService_1.name);
        this.queue = [];
        this.isProcessing = false;
        this.eventBuffer = [];
        this.eventCounter = 0;
        this.MAX_EVENTS = 200;
        this.ollamaHost = process.env.OLLAMA_HOST ?? 'http://ollama:11434';
        this.model = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b-instruct-q4_K_M';
        this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '60000', 10);
        this.maxRetries = parseInt(process.env.OLLAMA_MAX_RETRIES ?? '2', 10);
    }
    onModuleDestroy() {
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            item.reject(new Error('Service shutting down'));
        }
    }
    getEvents() {
        return [...this.eventBuffer].reverse();
    }
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            queueDepth: this.queue.length,
            model: this.model,
        };
    }
    emitEvent(type, conversationId, extra = {}) {
        const event = {
            id: ++this.eventCounter,
            timestamp: new Date().toISOString(),
            type,
            conversationId,
            ...extra,
        };
        this.eventBuffer.push(event);
        if (this.eventBuffer.length > this.MAX_EVENTS) {
            this.eventBuffer.shift();
        }
    }
    async enqueue(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            this.logger.log(`LLM queue: +1 (depth=${this.queue.length}, conversationId=${request.conversationId})`);
            this.emitEvent('queued', request.conversationId, {
                queueDepth: this.queue.length,
            });
            this.processNext();
        });
    }
    processNext() {
        if (this.isProcessing || this.queue.length === 0)
            return;
        this.isProcessing = true;
        const item = this.queue.shift();
        this.callOllama(item.request)
            .then((response) => {
            item.resolve(response);
        })
            .catch((err) => {
            item.reject(err);
        })
            .finally(() => {
            this.isProcessing = false;
            this.processNext();
        });
    }
    async callOllama(request) {
        const prompt = (0, prompt_builder_1.buildPrompt)(request.messages);
        const body = {
            model: this.model,
            messages: prompt,
            stream: false,
            options: {
                temperature: 0.3,
                num_predict: 512,
                num_ctx: 2048,
            },
        };
        let lastError = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const attemptStart = Date.now();
            try {
                this.logger.log(`Ollama call attempt ${attempt}/${this.maxRetries} (conversationId=${request.conversationId})`);
                this.emitEvent('thinking', request.conversationId, {
                    attempt,
                    maxRetries: this.maxRetries,
                });
                const raw = await this.fetchWithTimeout(body);
                const parsed = (0, llm_parser_1.parseLlmResponse)(raw);
                const durationMs = Date.now() - attemptStart;
                this.logger.log(`Ollama response type=${parsed.type} (conversationId=${request.conversationId})`);
                this.emitEvent('responded', request.conversationId, {
                    attempt,
                    responseType: parsed.type,
                    responsePreview: parsed.type === 'text'
                        ? parsed.content.slice(0, 120)
                        : JSON.stringify(parsed.payload).slice(0, 120),
                    durationMs,
                });
                return parsed;
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                const durationMs = Date.now() - attemptStart;
                this.logger.warn(`Ollama attempt ${attempt} failed: ${lastError.message}`);
                const isFinal = attempt >= this.maxRetries;
                this.emitEvent(isFinal ? 'error' : 'retry', request.conversationId, {
                    attempt,
                    maxRetries: this.maxRetries,
                    errorMessage: lastError.message,
                    durationMs,
                });
                if (!isFinal) {
                    await this.sleep(1500 * attempt);
                }
            }
        }
        throw lastError ?? new Error('Ollama call failed after retries');
    }
    async fetchWithTimeout(body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(`${this.ollamaHost}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Ollama HTTP ${response.status}: ${errText}`);
            }
            const data = (await response.json());
            if (!data.message?.content) {
                throw new Error('Ollama returned empty message content');
            }
            return data.message.content;
        }
        catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                throw new Error(`Ollama timed out after ${this.timeoutMs}ms`);
            }
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = LlmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LlmService);
//# sourceMappingURL=llm.service.js.map