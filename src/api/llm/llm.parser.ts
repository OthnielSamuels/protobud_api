import { Logger } from '@nestjs/common';
import {
  LlmResponse,
  LlmTextResponse,
  LlmInvoiceIntentResponse,
  InvoiceIntentPayload,
} from './llm.types';

const logger = new Logger('LlmParser');

// Valid enum values mirroring Prisma schema
const VALID_MATERIALS = [
  'PLA',
  'PETG',
  'ABS',
  'TPU',
  'RESIN',
  'NYLON',
  'OTHER',
];
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
  const embeddedMatch = trimmed.match(
    /(\{[\s\S]*"type"\s*:\s*"invoice_intent"[\s\S]*\})/,
  );
  if (embeddedMatch) return embeddedMatch[1];

  return null;
}

/**
 * Validates the invoice_intent payload strictly.
 * Returns error string if invalid, null if valid.
 */
function validateInvoicePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object')
    return 'payload is not an object';

  const p = payload as Record<string, unknown>;

  // client validation
  if (!p.client || typeof p.client !== 'object') return 'missing client object';
  const client = p.client as Record<string, unknown>;
  if (typeof client.name !== 'string' || !client.name.trim())
    return 'client.name is required';
  if (client.phone !== null && client.phone !== undefined) {
    if (typeof client.phone !== 'string' || !client.phone.trim()) {
      return 'client.phone must be a non-empty string when provided';
    }
  }

  // project validation
  if (!p.project || typeof p.project !== 'object')
    return 'missing project object';
  const project = p.project as Record<string, unknown>;
  if (typeof project.name !== 'string' || !project.name.trim())
    return 'project.name is required';

  if (project.material !== null && project.material !== undefined) {
    if (!VALID_MATERIALS.includes(project.material as string)) {
      return `invalid material: ${JSON.stringify(project.material)}`;
    }
  }

  if (project.quality !== null && project.quality !== undefined) {
    if (!VALID_QUALITIES.includes(project.quality as string)) {
      return `invalid quality: ${JSON.stringify(project.quality)}`;
    }
  }

  // items validation
  if (!Array.isArray(p.items) || p.items.length === 0)
    return 'items must be a non-empty array';

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

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeResponseType(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/-/g, '_');
}

function normalizeInvoicePayload(
  payload: Record<string, unknown>,
): InvoiceIntentPayload {
  const clientRaw =
    payload.client && typeof payload.client === 'object'
      ? (payload.client as Record<string, unknown>)
      : {};

  const projectRaw =
    payload.project && typeof payload.project === 'object'
      ? (payload.project as Record<string, unknown>)
      : {};

  const itemsRaw = Array.isArray(payload.items) ? payload.items : [];

  const material = normalizeOptionalString(projectRaw.material)?.toUpperCase();
  const quality = normalizeOptionalString(projectRaw.quality)?.toLowerCase();

  return {
    client: {
      name: normalizeOptionalString(clientRaw.name) ?? '',
      phone: normalizeOptionalString(clientRaw.phone),
      email: normalizeOptionalString(clientRaw.email),
      company: normalizeOptionalString(clientRaw.company),
    },
    project: {
      name: normalizeOptionalString(projectRaw.name) ?? '',
      description: normalizeOptionalString(projectRaw.description),
      material,
      quality,
      weightGrams: normalizeOptionalNumber(projectRaw.weightGrams),
      printHours: normalizeOptionalNumber(projectRaw.printHours),
      notes: normalizeOptionalString(projectRaw.notes),
    },
    items: itemsRaw.map((item) => {
      const itemRaw =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {};
      return {
        description: normalizeOptionalString(itemRaw.description) ?? '',
        quantity: normalizeOptionalNumber(itemRaw.quantity) ?? 0,
      };
    }),
  };
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

      if (normalizeResponseType(parsed.type) === 'invoice_intent') {
        // Support both formats:
        // 1) top-level client/project/items
        // 2) payload: { client, project, items }
        const payloadRoot =
          parsed.payload && typeof parsed.payload === 'object'
            ? (parsed.payload as Record<string, unknown>)
            : parsed;

        const payload = normalizeInvoicePayload(payloadRoot);

        const validationError = validateInvoicePayload(payload);

        if (validationError) {
          logger.warn(
            `Invalid invoice_intent payload: ${validationError}. Treating as text.`,
          );
          // Fall through to text response — don't crash, let chat continue
          return { type: 'text', content: trimmed } satisfies LlmTextResponse;
        }

        return {
          type: 'invoice_intent',
          payload,
        } satisfies LlmInvoiceIntentResponse;
      }

      // JSON parsed but not invoice_intent — treat as text
      logger.warn(
        `Unexpected JSON type: ${JSON.stringify(parsed.type)}. Treating as text.`,
      );
    } catch {
      // JSON.parse failed — treat as plain text
      logger.warn('JSON candidate found but parse failed. Treating as text.');
    }
  }

  // Step 2: plain text response
  return { type: 'text', content: trimmed } satisfies LlmTextResponse;
}
