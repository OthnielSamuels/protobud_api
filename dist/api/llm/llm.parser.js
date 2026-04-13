"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLlmResponse = parseLlmResponse;
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('LlmParser');
const VALID_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'RESIN', 'NYLON', 'OTHER'];
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
    if (typeof client.phone !== 'string' || !client.phone.trim())
        return 'client.phone is required';
    if (!p.project || typeof p.project !== 'object')
        return 'missing project object';
    const project = p.project;
    if (typeof project.name !== 'string' || !project.name.trim())
        return 'project.name is required';
    if (project.material !== null && project.material !== undefined) {
        if (!VALID_MATERIALS.includes(project.material)) {
            return `invalid material: ${project.material}`;
        }
    }
    if (project.quality !== null && project.quality !== undefined) {
        if (!VALID_QUALITIES.includes(project.quality)) {
            return `invalid quality: ${project.quality}`;
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
function parseLlmResponse(raw) {
    const trimmed = raw.trim();
    const jsonCandidate = extractJsonCandidate(trimmed);
    if (jsonCandidate) {
        try {
            const parsed = JSON.parse(jsonCandidate);
            if (parsed.type === 'invoice_intent') {
                const payload = {
                    client: parsed.client,
                    project: parsed.project,
                    items: parsed.items,
                };
                const validationError = validateInvoicePayload(payload);
                if (validationError) {
                    logger.warn(`Invalid invoice_intent payload: ${validationError}. Treating as text.`);
                    return { type: 'text', content: trimmed };
                }
                return {
                    type: 'invoice_intent',
                    payload: payload,
                };
            }
            logger.warn(`Unexpected JSON type: ${parsed.type}. Treating as text.`);
        }
        catch {
            logger.warn('JSON candidate found but parse failed. Treating as text.');
        }
    }
    return { type: 'text', content: trimmed };
}
//# sourceMappingURL=llm.parser.js.map