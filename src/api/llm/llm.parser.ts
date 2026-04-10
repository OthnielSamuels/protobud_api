import { Logger } from '@nestjs/common';
import {
  LlmResponse,
  LlmTextResponse,
  LlmInvoiceIntentResponse,
  InvoiceIntentPayload,
} from './llm.types';

const logger = new Logger('LlmParser');

// Valid enum values mirroring Prisma schema
const VALID_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'RESIN', 'NYLON', 'OTHER'];
const VALID_QUALITIES = ['draft', 'standard', 'high', 'ultra'];

/**
 * Attempts to extract a JSON block from the raw LLM output.
 * The model sometimes wraps JSON in ```json ... ``` fences despite instructions.
 * This handles both cases defensively.
 */
function extractJsonCandidate(raw: string): string | null {
  const trimmed = raw.trim();

  // Direct JSON object
  if (trimmed.startsWith('{')) return trimmed;

  // Fenced JSON block: ```json { ... } ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) return fenceMatch[1];

  // JSON embedded somewhere in text (last resort)
  const embeddedMatch = trimmed.match(/(\{[\s\S]*"type"\s*:\s*"invoice_intent"[\s\S]*\})/);
  if (embeddedMatch) return embeddedMatch[1];

  return null;
}

/**
 * Validates the invoice_intent payload strictly.
 * Returns error string if invalid, null if valid.
 */
function validateInvoicePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return 'payload is not an object';

  const p = payload as Record<string, unknown>;

  // client validation
  if (!p.client || typeof p.client !== 'object') return 'missing client object';
  const client = p.client as Record<string, unknown>;
  if (typeof client.name !== 'string' || !client.name.trim()) return 'client.name is required';
  if (typeof client.phone !== 'string' || !client.phone.trim()) return 'client.phone is required';

  // project validation
  if (!p.project || typeof p.project !== 'object') return 'missing project object';
  const project = p.project as Record<string, unknown>;
  if (typeof project.name !== 'string' || !project.name.trim()) return 'project.name is required';

  if (project.material !== null && project.material !== undefined) {
    if (!VALID_MATERIALS.includes(project.material as string)) {
      return `invalid material: ${project.material}`;
    }
  }

  if (project.quality !== null && project.quality !== undefined) {
    if (!VALID_QUALITIES.includes(project.quality as string)) {
      return `invalid quality: ${project.quality}`;
    }
  }

  // items validation
  if (!Array.isArray(p.items) || p.items.length === 0) return 'items must be a non-empty array';

  for (let i = 0; i < p.items.length; i++) {
    const item = p.items[i] as Record<string, unknown>;
    if (typeof item.description !== 'string' || !item.description.trim()) {
      return `items[${i}].description is required`;
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      return `items[${i}].quantity must be a positive number`;
    }
  }

  return null;
}

/**
 * Main parse function.
 * Returns a typed LlmResponse — either plain text or a validated invoice intent.
 */
export function parseLlmResponse(raw: string): LlmResponse {
  const trimmed = raw.trim();

  // Step 1: try to find a JSON candidate
  const jsonCandidate = extractJsonCandidate(trimmed);

  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;

      if (parsed.type === 'invoice_intent') {
        // Build the payload object from parsed data
        const payload = {
          client: parsed.client,
          project: parsed.project,
          items: parsed.items,
        };

        const validationError = validateInvoicePayload(payload);

        if (validationError) {
          logger.warn(`Invalid invoice_intent payload: ${validationError}. Treating as text.`);
          // Fall through to text response — don't crash, let chat continue
          return { type: 'text', content: trimmed } satisfies LlmTextResponse;
        }

        return {
          type: 'invoice_intent',
          payload: payload as InvoiceIntentPayload,
        } satisfies LlmInvoiceIntentResponse;
      }

      // JSON parsed but not invoice_intent — treat as text
      logger.warn(`Unexpected JSON type: ${parsed.type}. Treating as text.`);
    } catch {
      // JSON.parse failed — treat as plain text
      logger.warn('JSON candidate found but parse failed. Treating as text.');
    }
  }

  // Step 2: plain text response
  return { type: 'text', content: trimmed } satisfies LlmTextResponse;
}
