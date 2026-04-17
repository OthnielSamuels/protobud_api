// ---------------------------------------------------------------
// Input types
// ---------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system';

export interface LlmMessage {
  role: MessageRole;
  content: string;
}

export interface LlmRequest {
  conversationId: string;
  messages: LlmMessage[];
}

// ---------------------------------------------------------------
// Response types
// ---------------------------------------------------------------

export type LlmResponseType = 'text' | 'invoice_intent';

export interface LlmTextResponse {
  type: 'text';
  content: string;
}

export interface InvoiceIntentPayload {
  client: {
    name: string;
    phone?: string;
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

// ---------------------------------------------------------------
// Ollama raw API types
// ---------------------------------------------------------------

export interface OllamaRequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: false;
  options: {
    temperature: number;
    num_predict: number; // max output tokens
    num_ctx: number; // context window size
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

// ---------------------------------------------------------------
// LLM event tracking
// ---------------------------------------------------------------

export type LlmEventType =
  | 'queued' // request added to queue
  | 'thinking' // Ollama call attempt started
  | 'responded' // Ollama returned a successful response
  | 'retry' // attempt failed, will retry
  | 'error'; // final failure

export interface LlmEvent {
  id: number;
  timestamp: string; // ISO string
  type: LlmEventType;
  conversationId: string;
  queueDepth?: number; // for 'queued'
  attempt?: number; // for 'thinking' / 'retry'
  maxRetries?: number;
  responseType?: string; // for 'responded'
  responsePreview?: string; // first 120 chars of response
  durationMs?: number; // time from thinking → responded
  errorMessage?: string; // for 'retry' / 'error'
}
