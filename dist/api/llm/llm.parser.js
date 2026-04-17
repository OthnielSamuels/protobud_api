"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLlmResponse = parseLlmResponse;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('LlmParser');
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
function extractJsonCandidate(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{'))
        return trimmed;
    const fenceMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fenceMatch)
        return fenceMatch[1];
    const embeddedMatch = trimmed.match(/(\{[\s\S]*"type"\s*:\s*"invoice_intent"[\s\S]*\})/);
    if (embeddedMatch)
        return embeddedMatch[1];
    return null;
}
function validateInvoicePayload(payload) {
    if (!payload || typeof payload !== 'object')
        return 'payload is not an object';
    const p = payload;
    if (!p.client || typeof p.client !== 'object')
        return 'missing client object';
    const client = p.client;
    if (typeof client.name !== 'string' || !client.name.trim())
        return 'client.name is required';
    if (client.phone !== null && client.phone !== undefined) {
        if (typeof client.phone !== 'string' || !client.phone.trim()) {
            return 'client.phone must be a non-empty string when provided';
        }
    }
    if (!p.project || typeof p.project !== 'object')
        return 'missing project object';
    const project = p.project;
    if (typeof project.name !== 'string' || !project.name.trim())
        return 'project.name is required';
    if (project.material !== null && project.material !== undefined) {
        if (!VALID_MATERIALS.includes(project.material)) {
            return `invalid material: ${String(project.material)}`;
        }
    }
    if (project.quality !== null && project.quality !== undefined) {
        if (!VALID_QUALITIES.includes(project.quality)) {
            return `invalid quality: ${String(project.quality)}`;
        }
    }
    if (!Array.isArray(p.items) || p.items.length === 0)
        return 'items must be a non-empty array';
    for (let i = 0; i < p.items.length; i++) {
        const item = p.items[i];
        if (typeof item.description !== 'string' || !item.description.trim()) {
            return `items[${i}].description is required`;
        }
        if (typeof item.quantity !== 'number' || item.quantity < 1) {
            return `items[${i}].quantity must be a positive number`;
        }
    }
    return null;
}
function normalizeOptionalString(value) {
    if (value === null || value === undefined)
        return undefined;
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function normalizeOptionalNumber(value) {
    if (value === null || value === undefined)
        return undefined;
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
}
function normalizeResponseType(value) {
    if (typeof value !== 'string')
        return '';
    return value.trim().toLowerCase().replace(/-/g, '_');
}
function normalizeInvoicePayload(payload) {
    const clientRaw = payload.client && typeof payload.client === 'object'
        ? payload.client
        : {};
    const projectRaw = payload.project && typeof payload.project === 'object'
        ? payload.project
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
            const itemRaw = item && typeof item === 'object'
                ? item
                : {};
            return {
                description: normalizeOptionalString(itemRaw.description) ?? '',
                quantity: normalizeOptionalNumber(itemRaw.quantity) ?? 0,
            };
        }),
    };
}
function parseLlmResponse(raw) {
    const trimmed = raw.trim();
    const jsonCandidate = extractJsonCandidate(trimmed);
    if (jsonCandidate) {
        try {
            const parsed = JSON.parse(jsonCandidate);
            if (normalizeResponseType(parsed.type) === 'invoice_intent') {
                const payloadRoot = parsed.payload && typeof parsed.payload === 'object'
                    ? parsed.payload
                    : parsed;
                const payload = normalizeInvoicePayload(payloadRoot);
                const validationError = validateInvoicePayload(payload);
                if (validationError) {
                    logger.warn(`Invalid invoice_intent payload: ${validationError}. Treating as text.`);
                    return { type: 'text', content: trimmed };
                }
                return {
                    type: 'invoice_intent',
                    payload,
                };
            }
            logger.warn(`Unexpected JSON type: ${String(parsed.type)}. Treating as text.`);
        }
        catch {
            logger.warn('JSON candidate found but parse failed. Treating as text.');
        }
    }
    return { type: 'text', content: trimmed };
}
//# sourceMappingURL=llm.parser.js.map