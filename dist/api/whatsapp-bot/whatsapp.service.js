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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor() {
        this.logger = new common_1.Logger(WhatsappService_1.name);
        this.botUrl = process.env.WHATSAPP_BOT_URL ?? 'http://whatsapp-bot:3001';
    }
    async sendMessage(phone, text) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10_000);
            const response = await fetch(`${this.botUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, message: text }),
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!response.ok) {
                this.logger.warn(`Bot send failed: HTTP ${response.status}`);
                return false;
            }
            this.logger.log(`Message sent to ${phone}`);
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`sendMessage failed: ${msg}`);
            return false;
        }
    }
    async getHealth() {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5_000);
            const response = await fetch(`${this.botUrl}/health`, {
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!response.ok) {
                return { connected: false, status: 'bot_unhealthy' };
            }
            const data = (await response.json());
            return {
                connected: data.connected,
                status: data.connected ? 'connected' : 'disconnected',
            };
        }
        catch {
            return { connected: false, status: 'bot_unreachable' };
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map