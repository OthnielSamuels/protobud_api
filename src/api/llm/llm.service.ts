import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  LlmEvent,
  LlmEventType,
  LlmRequest,
  LlmResponse,
  OllamaRequestBody,
  OllamaResponse,
} from './llm.types';
import { buildPrompt } from './prompt.builder';
import { parseLlmResponse } from './llm.parser';

// ---------------------------------------------------------------
// Queue item — wraps a request with its promise resolution
// ---------------------------------------------------------------
interface QueueItem {
  request: LlmRequest;
  resolve: (value: LlmResponse) => void;
  reject: (reason: Error) => void;
}

@Injectable()
export class LlmService implements OnModuleDestroy {
  private readonly logger = new Logger(LlmService.name);

  // Config from env
  private readonly ollamaHost: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  // Single-request queue — CRITICAL for low-resource operation
  private readonly queue: QueueItem[] = [];
  private isProcessing = false;

  // Event tracking — circular buffer, last 200 events
  private readonly eventBuffer: LlmEvent[] = [];
  private eventCounter = 0;
  private readonly MAX_EVENTS = 200;

  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST ?? 'http://ollama:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'qwen3.5:4b-instruct-q4_K_M';
    this.timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '60000', 10);
    this.maxRetries = parseInt(process.env.OLLAMA_MAX_RETRIES ?? '2', 10);
  }

  onModuleDestroy() {
    // Drain queue on shutdown — reject pending requests gracefully
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.reject(new Error('Service shutting down'));
    }
  }

  // ---------------------------------------------------------------
  // PUBLIC: Event access
  // ---------------------------------------------------------------

  /** Returns all buffered events, newest first. */
  getEvents(): LlmEvent[] {
    return [...this.eventBuffer].reverse();
  }

  /** Returns current queue/processing state. */
  getStatus(): { isProcessing: boolean; queueDepth: number; model: string } {
    return {
      isProcessing: this.isProcessing,
      queueDepth: this.queue.length,
      model: this.model,
    };
  }

  // ---------------------------------------------------------------
  // PRIVATE: Event emitter
  // ---------------------------------------------------------------

  private emitEvent(
    type: LlmEventType,
    conversationId: string,
    extra: Partial<
      Omit<LlmEvent, 'id' | 'timestamp' | 'type' | 'conversationId'>
    > = {},
  ): void {
    const event: LlmEvent = {
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

  /**
   * Public API — enqueue a request and wait for resolution.
   * Callers await this; concurrency is handled internally.
   *
   * Multiple WhatsApp conversations calling this simultaneously
   * will each get their own Promise, resolved in FIFO order.
   */
  async enqueue(request: LlmRequest): Promise<LlmResponse> {
    return new Promise<LlmResponse>((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.logger.log(
        `LLM queue: +1 (depth=${this.queue.length}, conversationId=${request.conversationId})`,
      );
      this.emitEvent('queued', request.conversationId, {
        queueDepth: this.queue.length,
      });
      // Kick off processing if not already running
      this.processNext();
    });
  }

  // ---------------------------------------------------------------
  // PRIVATE: Queue processor
  // ---------------------------------------------------------------

  private processNext(): void {
    // Already running — do nothing, the loop will pick up next item
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    const item = this.queue.shift()!;

    this.callOllama(item.request)
      .then((response) => {
        item.resolve(response);
      })
      .catch((err: Error) => {
        item.reject(err);
      })
      .finally(() => {
        this.isProcessing = false;
        // Process the next item in the queue if any
        this.processNext();
      });
  }

  // ---------------------------------------------------------------
  // PRIVATE: Ollama HTTP call with retry
  // ---------------------------------------------------------------

  private async callOllama(request: LlmRequest): Promise<LlmResponse> {
    const prompt = buildPrompt(request.messages);

    const body: OllamaRequestBody = {
      model: this.model,
      messages: prompt,
      stream: false,
      options: {
        temperature: 0.3, // Low temp — we want consistent, structured output
        num_predict: 512, // Max output tokens — keep short to save VRAM/time
        num_ctx: 2048, // Context window — sufficient for 5 messages + system prompt
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const attemptStart = Date.now();
      try {
        this.logger.log(
          `Ollama call attempt ${attempt}/${this.maxRetries} (conversationId=${request.conversationId})`,
        );
        this.emitEvent('thinking', request.conversationId, {
          attempt,
          maxRetries: this.maxRetries,
        });

        const raw = await this.fetchWithTimeout(body);
        const parsed = parseLlmResponse(raw);
        const durationMs = Date.now() - attemptStart;

        this.logger.log(
          `Ollama response type=${parsed.type} (conversationId=${request.conversationId})`,
        );
        this.emitEvent('responded', request.conversationId, {
          attempt,
          responseType: parsed.type,
          responsePreview:
            parsed.type === 'text'
              ? parsed.content.slice(0, 120)
              : JSON.stringify(parsed.payload).slice(0, 120),
          durationMs,
        });

        return parsed;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const durationMs = Date.now() - attemptStart;
        this.logger.warn(
          `Ollama attempt ${attempt} failed: ${lastError.message}`,
        );

        const isFinal = attempt >= this.maxRetries;
        this.emitEvent(isFinal ? 'error' : 'retry', request.conversationId, {
          attempt,
          maxRetries: this.maxRetries,
          errorMessage: lastError.message,
          durationMs,
        });

        // Don't retry on the last attempt
        if (!isFinal) {
          // Brief pause before retry — don't hammer a struggling model
          await this.sleep(1500 * attempt);
        }
      }
    }

    throw lastError ?? new Error('Ollama call failed after retries');
  }

  // ---------------------------------------------------------------
  // PRIVATE: fetch with AbortController timeout
  // ---------------------------------------------------------------

  private async fetchWithTimeout(body: OllamaRequestBody): Promise<string> {
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

      const data = (await response.json()) as OllamaResponse;

      if (!data.message?.content) {
        throw new Error('Ollama returned empty message content');
      }

      return data.message.content;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Ollama timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
